from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    UserViewSet, PasswordResetRequestView, PasswordResetView, 
    VoucherViewSet, CampaignViewSet, StoreViewSet, ClaimViewSet, DashboardStatsView,
    NotificationViewSet, TransactionViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'vouchers', VoucherViewSet, basename='voucher')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'stores', StoreViewSet, basename='store')
router.register(r'claims', ClaimViewSet, basename='claim')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/password-reset-request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('users/password-reset/<str:uidb64>/<str:token>/', PasswordResetView.as_view(), name='password-reset'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
