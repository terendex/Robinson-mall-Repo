from django.urls import path
from .views import get_student, get_subject, createStudent, updateStudent, createSub, updateSub

urlpatterns = [
    path('students/', get_student, name='get_students'),
    path('students/add/', createStudent, name='create_student'),
    path('students/update/', updateStudent, name='update_student'),

    path('subjects/', get_subject, name='get_subjects'),
    path('subjects/add/', createSub, name='create_subject'),
    path('subjects/update/', updateSub, name='update_subject'),
]