from django.shortcuts import render
from rest_framework import viewsets
from .serializers import ConversationSerializer, MessageSerializer
from .models import Message, Conversation

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)
    

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(conversation__participants=self.request.user)
