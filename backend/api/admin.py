from django.contrib import admin

from .models import User, Voucher, Campaign

admin.site.register(User)
admin.site.register(Voucher)
admin.site.register(Campaign)
