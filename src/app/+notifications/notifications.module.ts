import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComponentsModule } from '../components/components.module';

import { NotificationsRoutingModule } from './notifications-routing.module';
import { NotificationsContainerComponent } from './notifications-container/notifications-container.component';

@NgModule({
  imports: [
    CommonModule,
    ComponentsModule,
    NotificationsRoutingModule
  ],
  declarations: [NotificationsContainerComponent]
})
export class NotificationsModule { }
