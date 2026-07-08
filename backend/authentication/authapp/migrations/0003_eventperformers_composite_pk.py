# Fix EventPerformers to match the real table: its PK is the
# (event_id, performer_id) pair, not an implicit surrogate id column.
# Without this every ORM query against event_performers fails with
# "Unknown column 'event_performers.id'".

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authapp', '0002_payments'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='eventperformers',
            name='id',
        ),
        migrations.AddField(
            model_name='eventperformers',
            name='pk',
            field=models.CompositePrimaryKey('event_id', 'performer_id', blank=True, editable=False, primary_key=True, serialize=False),
        ),
    ]
