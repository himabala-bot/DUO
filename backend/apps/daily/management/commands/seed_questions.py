from django.core.management.base import BaseCommand
from apps.daily.models import DailyQuestion

DEFAULT_QUESTIONS = [
    {"question": "How are we feeling today?", "category": "DAILY", "order": 1},
    {"question": "What's on your mind right now?", "category": "DAILY", "order": 2},
    {"question": "What do you need today to feel supported?", "category": "SUPPORT", "order": 3},
    {"question": "What was the highlight or best part of your day?", "category": "GRATITUDE", "order": 4},
    {"question": "What's something you want to tell me but haven't found the time?", "category": "REFLECTION", "order": 5},
    {"question": "What's something that made you smile or laugh today?", "category": "JOY", "order": 6},
]

class Command(BaseCommand):
    help = 'Seed initial daily connection questions'

    def handle(self, *args, **options):
        count = 0
        for item in DEFAULT_QUESTIONS:
            obj, created = DailyQuestion.objects.get_or_create(
                question=item['question'],
                defaults={
                    'category': item.get('category', 'DAILY'),
                    'order': item.get('order', 0),
                    'active': True
                }
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f"Created question: '{obj.question}'"))
            else:
                self.stdout.write(f"Question already exists: '{obj.question}'")

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} new daily questions."))
