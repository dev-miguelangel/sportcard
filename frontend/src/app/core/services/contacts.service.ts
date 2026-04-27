import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContactUser {
  id: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  isContact: boolean;
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export interface GroupMember {
  userId: string;
  name: string;
  avatar: string | null;
  stringId: string;
}

export interface UserProfile {
  id: string;
  stringId: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  city: string | null;
  sports: string[];
  bloodType: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly http = inject(HttpClient);

  search(q: string): Observable<ContactUser[]> {
    return this.http.get<ContactUser[]>(`${environment.apiUrl}/contacts/search`, {
      params: { q },
    });
  }

  getContacts(): Observable<ContactUser[]> {
    return this.http.get<ContactUser[]>(`${environment.apiUrl}/contacts`);
  }

  getFollowers(): Observable<ContactUser[]> {
    return this.http.get<ContactUser[]>(`${environment.apiUrl}/contacts/followers`);
  }

  addContact(userId: string): Observable<ContactUser> {
    return this.http.post<ContactUser>(`${environment.apiUrl}/contacts/${userId}`, {});
  }

  removeContact(userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/contacts/${userId}`);
  }

  getGroups(): Observable<ContactGroup[]> {
    return this.http.get<ContactGroup[]>(`${environment.apiUrl}/contacts/groups`);
  }

  createGroup(name: string, description?: string): Observable<ContactGroup> {
    return this.http.post<ContactGroup>(`${environment.apiUrl}/contacts/groups`, { name, description });
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/contacts/groups/${groupId}`);
  }

  getGroupMembers(groupId: string): Observable<GroupMember[]> {
    return this.http.get<GroupMember[]>(`${environment.apiUrl}/contacts/groups/${groupId}/members`);
  }

  addGroupMember(groupId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/contacts/groups/${groupId}/members`, { userId });
  }

  removeGroupMember(groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/contacts/groups/${groupId}/members/${userId}`);
  }

  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/users/${userId}/profile`);
  }
}
