import uuid
from django.db import migrations


def generate_claim_ref(first_name, last_name, email):
    initials = ((first_name or '')[:1] + (last_name or '')[:1]).upper()
    if not initials:
        initials = (email or 'XX')[:2].upper()
    name_part = ((first_name or '') or (email or ''))[:6].upper() or 'GUEST'
    return f"{initials}-{name_part}+{uuid.uuid4().hex[:8].upper()}"


def backfill_claim_refs(apps, schema_editor):
    Claim = apps.get_model('api', 'Claim')
    User = apps.get_model('api', 'User')

    empty_claims = list(Claim.objects.filter(claim_ref='').select_related('user'))
    used_refs = set(Claim.objects.exclude(claim_ref='').values_list('claim_ref', flat=True))

    for claim in empty_claims:
        user = claim.user
        fn = getattr(user, 'first_name', '') or ''
        ln = getattr(user, 'last_name', '') or ''
        em = getattr(user, 'email', '') or ''

        for _ in range(10):
            candidate = generate_claim_ref(fn, ln, em)
            if candidate not in used_refs:
                claim.claim_ref = candidate
                used_refs.add(candidate)
                break
        else:
            # Fallback: longer unique key
            claim.claim_ref = f"CLM+{uuid.uuid4().hex[:12].upper()}"
            used_refs.add(claim.claim_ref)

        claim.save(update_fields=['claim_ref'])


def reverse_backfill(apps, schema_editor):
    # Nothing meaningful to reverse — leave claim_refs as-is
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_add_claim_ref'),
    ]

    operations = [
        migrations.RunPython(backfill_claim_refs, reverse_code=reverse_backfill),
    ]
