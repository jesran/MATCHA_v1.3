# Matcha 1.3 project metadata migration.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_user_mobile_projectjoinrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="github_repo",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="project",
            name="evaluation_result",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
