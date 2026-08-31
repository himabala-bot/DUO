import uuid
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.authentication.models import Profile
from apps.duos.models import Duo, DuoMember, ConnectionRequest
from apps.chat.models import Message
from apps.drawings.models import Drawing
from apps.daily.models import DailyQuestion, DailyResponse
from apps.notifications.models import Notification

User = get_user_model()

class DuoComprehensiveTests(TestCase):
    def setUp(self):
        # Create User A (Hima)
        self.auth_id_a = uuid.uuid4()
        self.user_a = User.objects.create(username=str(self.auth_id_a), email="hima@example.com", first_name="Hima")
        self.profile_a = Profile.objects.create(
            auth_user_id=self.auth_id_a,
            name="Hima",
            email="hima@example.com"
        )
        self.user_a.profile = self.profile_a

        # Create User B (Jai)
        self.auth_id_b = uuid.uuid4()
        self.user_b = User.objects.create(username=str(self.auth_id_b), email="jai@example.com", first_name="Jai")
        self.profile_b = Profile.objects.create(
            auth_user_id=self.auth_id_b,
            name="Jai",
            email="jai@example.com"
        )
        self.user_b.profile = self.profile_b

        # Create User C (Alex - Unconnected third person)
        self.auth_id_c = uuid.uuid4()
        self.user_c = User.objects.create(username=str(self.auth_id_c), email="alex@example.com", first_name="Alex")
        self.profile_c = Profile.objects.create(
            auth_user_id=self.auth_id_c,
            name="Alex",
            email="alex@example.com"
        )
        self.user_c.profile = self.profile_c

        # Daily Questions
        self.q1 = DailyQuestion.objects.create(
            question="How are we feeling today?",
            category="DAILY",
            active=True,
            order=1
        )
        self.q2 = DailyQuestion.objects.create(
            question="What's on your mind right now?",
            category="DAILY",
            active=True,
            order=2
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

        self.client_c = APIClient()
        self.client_c.force_authenticate(user=self.user_c)

    def test_profile_creation_and_duo_code(self):
        """Test unique DUO code generation on profile creation."""
        self.assertTrue(self.profile_a.duo_code.startswith("DUO-"))
        self.assertTrue(self.profile_b.duo_code.startswith("DUO-"))
        self.assertNotEqual(self.profile_a.duo_code, self.profile_b.duo_code)

        # Test profile get & update
        res = self.client_a.get('/api/auth/profile/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Hima')

        res_update = self.client_a.patch('/api/auth/profile/', {'name': 'Himabala'})
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data['profile']['name'], 'Himabala')

    def test_connection_flow_and_restrictions(self):
        """Test connection request, validation checks, and acceptance."""
        # 1. Self-connection blocked
        res = self.client_a.post('/api/duo/connect/', {'code': self.profile_a.duo_code})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Invalid code
        res = self.client_a.post('/api/duo/connect/', {'code': 'DUO-NONEXIST'})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 3. User A connects with User B
        res = self.client_a.post('/api/duo/connect/', {'code': self.profile_b.duo_code})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ConnectionRequest.objects.filter(sender=self.profile_a, receiver=self.profile_b, status='PENDING').count(), 1)

        # Notification created for User B
        notif_b = Notification.objects.filter(recipient=self.profile_b, type='CONNECTION_REQUEST').first()
        self.assertIsNotNone(notif_b)
        self.assertIn("Hima", notif_b.body)

        # 4. Duplicate request blocked
        res_dup = self.client_a.post('/api/duo/connect/', {'code': self.profile_b.duo_code})
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. User B accepts request
        req_id = ConnectionRequest.objects.get(sender=self.profile_a, receiver=self.profile_b).id
        res_accept = self.client_b.post(f'/api/duo/requests/{req_id}/accept/')
        self.assertEqual(res_accept.status_code, status.HTTP_200_OK)

        # Refresh profiles
        self.profile_a.refresh_from_db()
        self.profile_b.refresh_from_db()
        self.assertIsNotNone(self.profile_a.active_duo)
        self.assertIsNotNone(self.profile_b.active_duo)
        self.assertEqual(self.profile_a.partner.id, self.profile_b.id)
        self.assertEqual(self.profile_b.partner.id, self.profile_a.id)

        # 6. Third user C tries to connect with A or B -> rejected because A & B are in active DUO
        res_c = self.client_c.post('/api/duo/connect/', {'code': self.profile_a.duo_code})
        self.assertEqual(res_c.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unconnected_user_cannot_access_duo_features(self):
        """Test that user without active DUO cannot post messages, drawings, or access daily responses."""
        # Client C has no DUO
        res_msg = self.client_c.get('/api/messages/')
        self.assertEqual(res_msg.status_code, status.HTTP_403_FORBIDDEN)

        res_draw = self.client_c.get('/api/drawings/')
        self.assertEqual(res_draw.status_code, status.HTTP_403_FORBIDDEN)

        res_daily = self.client_c.get('/api/daily/responses/')
        self.assertEqual(res_daily.status_code, status.HTTP_403_FORBIDDEN)

    def test_messaging_and_read_status(self):
        """Test sending message, partner notification, and mark-read."""
        duo = Duo.objects.create(status='ACTIVE')
        DuoMember.objects.create(duo=duo, user=self.profile_a)
        DuoMember.objects.create(duo=duo, user=self.profile_b)

        # User A sends message
        res = self.client_a.post('/api/messages/', {'content': 'Hello my love!'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        msg_id = res.data['id']

        msg = Message.objects.get(id=msg_id)
        self.assertEqual(msg.sender, self.profile_a)
        self.assertEqual(msg.receiver, self.profile_b)
        self.assertIsNone(msg.read_at)

        notif = Notification.objects.filter(recipient=self.profile_b, type='MESSAGE').first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.reference_id, str(msg.id))

        # User B fetches messages
        res_b = self.client_b.get('/api/messages/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_b.data['messages']), 1)

        # User B marks messages read
        res_read = self.client_b.post('/api/messages/mark-read/')
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        msg.refresh_from_db()
        self.assertIsNotNone(msg.read_at)

    def test_drawings_creation_and_listing(self):
        """Test creating drawing record and listing."""
        duo = Duo.objects.create(status='ACTIVE')
        DuoMember.objects.create(duo=duo, user=self.profile_a)
        DuoMember.objects.create(duo=duo, user=self.profile_b)

        # User A posts drawing
        res = self.client_a.post('/api/drawings/', {
            'storage_path': f'drawings/{duo.id}/test_draw.png',
            'caption': 'A heart for you'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['caption'], 'A heart for you')

        # Notification for User B
        notif = Notification.objects.filter(recipient=self.profile_b, type='DRAWING').first()
        self.assertIsNotNone(notif)
        self.assertIn("A heart for you", notif.body)

        # User B lists drawings
        res_list = self.client_b.get('/api/drawings/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.data['count'], 1)

    def test_daily_questions_draft_privacy_and_history(self):
        """Test that drafts by User A remain strictly private from User B until submitted and history tracks properly."""
        duo = Duo.objects.create(status='ACTIVE')
        DuoMember.objects.create(duo=duo, user=self.profile_a)
        DuoMember.objects.create(duo=duo, user=self.profile_b)

        today_str = date.today().isoformat()

        # User A saves a DRAFT answer
        draft_payload = {
            'date': today_str,
            'action': 'SAVE_DRAFT',
            'responses': [
                {'question_id': str(self.q1.id), 'answer': 'My private draft thought'}
            ]
        }
        res_a_draft = self.client_a.post('/api/daily/responses/', draft_payload, format='json')
        self.assertEqual(res_a_draft.status_code, status.HTTP_200_OK)
        self.assertEqual(res_a_draft.data['status'], 'DRAFT')

        # User B checks responses for today -> User A's draft MUST NOT appear
        res_b_view = self.client_b.get(f'/api/daily/responses/?date={today_str}')
        self.assertEqual(res_b_view.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_b_view.data['partner_responses']), 0)
        self.assertEqual(res_b_view.data['partner_status'], 'NOT_SUBMITTED')

        # History should be empty because no submitted responses
        res_hist_empty = self.client_b.get('/api/daily/history/')
        self.assertEqual(res_hist_empty.data['total_days'], 0)

        # User A submits their responses
        submit_payload = {
            'date': today_str,
            'action': 'SUBMIT',
            'responses': [
                {'question_id': str(self.q1.id), 'answer': 'Feeling wonderful today!'},
                {'question_id': str(self.q2.id), 'answer': 'Looking forward to dinner.'}
            ]
        }
        res_a_submit = self.client_a.post('/api/daily/responses/', submit_payload, format='json')
        self.assertEqual(res_a_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_a_submit.data['status'], 'SUBMITTED')

        # User B checks responses for today -> User A's submitted response IS NOW VISIBLE
        res_b_view2 = self.client_b.get(f'/api/daily/responses/?date={today_str}')
        self.assertEqual(res_b_view2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_b_view2.data['partner_responses']), 2)
        self.assertEqual(res_b_view2.data['partner_status'], 'SUBMITTED')

        # History now shows 1 day
        res_hist = self.client_b.get('/api/daily/history/')
        self.assertEqual(res_hist.data['total_days'], 1)

    def test_notifications_listing_and_read(self):
        """Test listing notifications, read single, and read all."""
        Notification.objects.create(
            recipient=self.profile_a,
            type='MESSAGE',
            title='Test 1',
            body='Test message 1'
        )
        Notification.objects.create(
            recipient=self.profile_a,
            type='DRAWING',
            title='Test 2',
            body='Test message 2'
        )

        res = self.client_a.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['unread_count'], 2)

        res_read_all = self.client_a.post('/api/notifications/read-all/')
        self.assertEqual(res_read_all.status_code, status.HTTP_200_OK)
        self.assertEqual(res_read_all.data['marked_read'], 2)

        res_after = self.client_a.get('/api/notifications/')
        self.assertEqual(res_after.data['unread_count'], 0)
