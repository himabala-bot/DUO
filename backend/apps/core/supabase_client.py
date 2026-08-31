import logging
from django.conf import settings

logger = logging.getLogger(__name__)

_supabase_admin_client = None

def get_supabase_admin_client():
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    supabase_url = getattr(settings, 'SUPABASE_URL', '')
    supabase_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '') or getattr(settings, 'SUPABASE_ANON_KEY', '')

    if not supabase_url or not supabase_key:
        return None

    try:
        from supabase import create_client
        _supabase_admin_client = create_client(supabase_url, supabase_key)
        return _supabase_admin_client
    except Exception as e:
        logger.warning(f"Supabase client initialization: {e}")
        return None

def get_signed_url(bucket_name: str, file_path: str, expires_in: int = 3600) -> str:
    """
    Generate a signed URL for a file in a private Supabase Storage bucket.
    """
    if not file_path:
        return ""
    
    if file_path.startswith(('data:', 'http://', 'https://')):
        return file_path

    client = get_supabase_admin_client()
    if not client:
        supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
        if supabase_url:
            return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{file_path}"
        return file_path

    try:
        res = client.storage.from_(bucket_name).create_signed_url(file_path, expires_in)
        if isinstance(res, dict) and 'signedURL' in res:
            return res['signedURL']
        elif hasattr(res, 'signed_url') and res.signed_url:
            return res.signed_url
        return str(res)
    except Exception as e:
        supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
        if supabase_url:
            return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{file_path}"
        return file_path

def sync_record_to_supabase(table: str, data: dict):
    """
    Safely mirrors database records to Supabase PostgreSQL table.
    """
    try:
        client = get_supabase_admin_client()
        if client:
            client.table(table).upsert(data).execute()
    except Exception as e:
        logger.debug(f"Supabase {table} sync: {e}")
