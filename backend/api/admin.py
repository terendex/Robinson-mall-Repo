from django.contrib import admin
from .models import Student, Subjects

class StudentAdmin(admin.ModelAdmin):
    list_display = ['name', 'age', 'gender', 'course', 'ylevel']

class SubjectsAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'course', 'ylevel']

admin.site.register(Student, StudentAdmin)
admin.site.register(Subjects, SubjectsAdmin)