from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, PasswordResetRequestView, PasswordResetView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('users/password-reset-request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('users/password-reset/<str:token>/', PasswordResetView.as_view(), name='password-reset'),
    path('', include(router.urls)),
]
