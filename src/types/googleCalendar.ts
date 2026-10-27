export interface GoogleCalendarEvent {id:string;title:string;start:string;end:string;allDay:boolean;url:string|null;colorId?:string;backgroundColor?:string;etag?:string;recurring?:boolean;editable?:boolean;description?:string;location?:string}
export interface GoogleCalendarStatus {configured:boolean;connected:boolean}
export interface GoogleEventInput {title:string;description:string;location:string;start:string;end:string;allDay:boolean}
