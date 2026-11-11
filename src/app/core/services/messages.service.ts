import { Injectable, inject } from '@angular/core';
import { Message, MessageInput } from '../../shared/models/api.models';
import { ApiService } from './api.service';

@Injectable({providedIn: 'root'})
export class MessagesService {
  private api = inject(ApiService);
  list(negotiationId: number) { return this.api.all<Message>(`/messages/${negotiationId}`, 500); }
  send(input: MessageInput) { return this.api.post<Message[]>('/messages/', input); }
}
