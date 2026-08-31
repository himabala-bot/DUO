import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'success': False,
            'error': str(exc),
            'status_code': response.status_code,
            'details': response.data
        }
        if isinstance(response.data, dict) and 'detail' in response.data:
            custom_data['error'] = response.data['detail']
        response.data = custom_data
    else:
        logger.exception("Unhandled server exception: %s", exc)
        return Response(
            {
                'success': False,
                'error': 'Internal server error occurred',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'details': str(exc)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
