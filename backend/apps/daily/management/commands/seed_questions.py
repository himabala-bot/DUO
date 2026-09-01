from django.core.management.base import BaseCommand
from apps.daily.models import DailyQuestion

SEED_QUESTIONS = [
    # 1-10
    {"question": "What tiny thing made you smile recently?", "genre": "FUN", "order": 1},
    {"question": "If we had a completely free day together tomorrow, how would you spend it?", "genre": "IMAGINATIVE", "order": 2},
    {"question": "What is something you wish more people knew about you?", "genre": "DEEP", "order": 3},
    {"question": "What random topic could you talk about for hours?", "genre": "FUN", "order": 4},
    {"question": "What is a memory from childhood that still makes you laugh?", "genre": "FUN", "order": 5},
    {"question": "If our relationship had a soundtrack, what kind of song would be playing right now?", "genre": "IMAGINATIVE", "order": 6},
    {"question": "What is something you have changed your mind about in the last few years?", "genre": "DEEP", "order": 7},
    {"question": "What is one ordinary moment you secretly really enjoy?", "genre": "DEEP", "order": 8},
    {"question": "If you could instantly become amazing at one skill, what would you choose?", "genre": "IMAGINATIVE", "order": 9},
    {"question": "What kind of place makes you feel instantly comfortable?", "genre": "DEEP", "order": 10},

    # 11-20
    {"question": "What is the funniest misunderstanding you have ever had?", "genre": "FUN", "order": 11},
    {"question": "If money and time did not matter, what would you want us to experience together?", "genre": "IMAGINATIVE", "order": 12},
    {"question": "What is something you are currently curious about?", "genre": "FUN", "order": 13},
    {"question": "What is one thing you think we would be ridiculously good at doing together?", "genre": "FUN", "order": 14},
    {"question": "What smell instantly reminds you of a specific memory?", "genre": "DEEP", "order": 15},
    {"question": "If you could relive one completely ordinary day from your life, which would you pick?", "genre": "DEEP", "order": 16},
    {"question": "What is a weird little habit you have that most people probably don't notice?", "genre": "FUN", "order": 17},
    {"question": "What would your perfect lazy Sunday look like?", "genre": "FUN", "order": 18},
    {"question": "What is something you used to dislike but now genuinely enjoy?", "genre": "DEEP", "order": 19},
    {"question": "If you could teleport us anywhere for dinner tonight, where would we go?", "genre": "IMAGINATIVE", "order": 20},

    # 21-30
    {"question": "What is one compliment you still remember?", "genre": "DEEP", "order": 21},
    {"question": "What kind of adventure would you love for us to have someday?", "genre": "IMAGINATIVE", "order": 22},
    {"question": "What is something you find beautiful that other people might overlook?", "genre": "DEEP", "order": 23},
    {"question": "If you could ask your future self one question, what would it be?", "genre": "IMAGINATIVE", "order": 24},
    {"question": "What is one thing that always makes a bad day slightly better?", "genre": "FUN", "order": 25},
    {"question": "What fictional world would you want us to spend a week in?", "genre": "IMAGINATIVE", "order": 26},
    {"question": "What is something you have always wanted to learn just for fun?", "genre": "FUN", "order": 27},
    {"question": "Which version of yourself from the past would you most like to have a conversation with?", "genre": "DEEP", "order": 28},
    {"question": "What is your ideal kind of weekend?", "genre": "FUN", "order": 29},
    {"question": "What is a completely unnecessary thing that brings you way too much joy?", "genre": "FUN", "order": 30},

    # 31-40
    {"question": "If we opened a tiny café together, what would it be like?", "genre": "IMAGINATIVE", "order": 31},
    {"question": "What is one experience you think everyone should have at least once?", "genre": "DEEP", "order": 32},
    {"question": "What is something you are proud of that you rarely talk about?", "genre": "DEEP", "order": 33},
    {"question": "If you could watch one moment from your future, what would you want to see?", "genre": "IMAGINATIVE", "order": 34},
    {"question": "What kind of conversations do you wish people had more often?", "genre": "DEEP", "order": 35},
    {"question": "What is one place you would happily visit again and again?", "genre": "FUN", "order": 36},
    {"question": "What is something you believed as a child that makes you laugh now?", "genre": "FUN", "order": 37},
    {"question": "If you could swap lives with any fictional character for one day, who would it be?", "genre": "IMAGINATIVE", "order": 38},
    {"question": "What is one small thing that makes a space feel like home to you?", "genre": "DEEP", "order": 39},
    {"question": "What is a dream you have that feels slightly ridiculous but exciting?", "genre": "IMAGINATIVE", "order": 40},

    # 41-50
    {"question": "What would our completely spontaneous day look like?", "genre": "IMAGINATIVE", "order": 41},
    {"question": "What is something you want to remember about this phase of your life?", "genre": "DEEP", "order": 42},
    {"question": "If you could preserve one sound from your life forever, what would it be?", "genre": "DEEP", "order": 43},
    {"question": "What is something you think we should try at least once together?", "genre": "FUN", "order": 44},
    {"question": "What is one question you wish someone would ask you more often?", "genre": "DEEP", "order": 45},
    {"question": "If you could create one new holiday, what would people celebrate?", "genre": "IMAGINATIVE", "order": 46},
    {"question": "What is a moment when you surprised yourself?", "genre": "DEEP", "order": 47},
    {"question": "What would you do if you had an entire month with absolutely no responsibilities?", "genre": "IMAGINATIVE", "order": 48},
    {"question": "What is one thing you hope your future home always has?", "genre": "IMAGINATIVE", "order": 49},
    {"question": "If you could turn one of our ordinary moments into a photograph on the wall forever, which moment would you choose?", "genre": "DEEP", "order": 50},
]

class Command(BaseCommand):
    help = 'Seeds initial 50 curated questions with genres into the database'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for item in SEED_QUESTIONS:
            obj, created = DailyQuestion.objects.update_or_create(
                question=item['question'],
                defaults={
                    'genre': item['genre'],
                    'order': item['order'],
                    'active': True,
                    'category': 'DAILY',
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded questions! Created: {created_count}, Updated: {updated_count}, Total: {DailyQuestion.objects.count()}"
        ))
