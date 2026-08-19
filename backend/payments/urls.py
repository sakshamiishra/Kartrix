from django.urls import path
from .views import CreateRazorpayOrderView, VerifyRazorpayPaymentView

urlpatterns = [
    path('create-razorpay-order/', CreateRazorpayOrderView.as_view(), name='create-razorpay-order'),
    path('verify-razorpay-payment/', VerifyRazorpayPaymentView.as_view(), name='verify-razorpay-payment'),
]
