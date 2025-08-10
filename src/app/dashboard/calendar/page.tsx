
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document, CalendarEvent as CalendarEventType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, Inbox } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import Link from "next/link";


type CalendarEvent = {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  documentId: string;
}

export default function CalendarPage() {
  const { user, isFirebaseEnabled, db } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!user || !isFirebaseEnabled || !db) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    // Query documents where the event.events array is not empty.
    const q = query(
        collection(db, "documents"), 
        where("userId", "==", user.uid),
        where("event.events", "!=", []),
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allEvents: CalendarEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Document;
        // A single document can have multiple events.
        if (data.event && data.event.events) {
            data.event.events.forEach((event: CalendarEventType) => {
                allEvents.push({
                    id: `${doc.id}-${event.title}`,
                    title: event.title,
                    startDate: parseISO(event.startDate),
                    endDate: event.endDate ? parseISO(event.endDate) : undefined,
                    description: event.description || undefined,
                    documentId: doc.id,
                });
            });
        }
      });
      setEvents(allEvents);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching events: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isFirebaseEnabled, db]);

  const eventDays = useMemo(() => {
    return events.map(event => event.startDate);
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(event.startDate, selectedDate));
  }, [events, selectedDate]);

  const formatEventTime = (start: Date, end: Date | undefined) => {
    if (end) {
        if (isSameDay(start, end)) {
            return `${format(start, 'p')} - ${format(end, 'p')}`;
        }
        return `${format(start, 'p')} - ${format(end, 'p')}`;
    }
    return format(start, 'p');
  }

  if (!isFirebaseEnabled) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Firebase Not Configured</AlertTitle>
                <AlertDescription>
                    Cannot load calendar. Please configure your Firebase API keys.
                </AlertDescription>
            </Alert>
        </div>
    )
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">Events automatically detected from your documents.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardContent className="p-2">
                    <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="p-0"
                            classNames={{
                                day_cell: "text-center",
                            }}
                            modifiers={{
                                hasEvent: eventDays,
                            }}
                            modifiersStyles={{
                                hasEvent: { 
                                    position: 'relative',
                                }
                            }}
                            components={{
                                DayContent: (props) => {
                                    const { date, activeModifiers } = props;
                                    return (
                                        <div className="relative flex items-center justify-center h-full w-full">
                                            <span>{format(date, 'd')}</span>
                                            {activeModifiers.hasEvent && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary" />}
                                        </div>
                                    );
                                },
                            }}
                        />
                    </CardContent>
                </Card>
                 <UpcomingEvents />
            </div>

            <Card className="lg:col-span-1 sticky top-20">
                <CardHeader>
                    <CardTitle>
                        Events for {selectedDate ? format(selectedDate, "PPP") : '...'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                     )}

                    {!loading && selectedDayEvents.length > 0 && (
                        <ul className="space-y-3">
                            {selectedDayEvents.map(event => (
                                <li key={event.id} className="p-3 rounded-md border bg-muted/20">
                                    <p className="font-semibold text-sm">{event.title}</p>
                                     <p className="text-xs text-muted-foreground">{formatEventTime(event.startDate, event.endDate)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                        <Link href={`/dashboard/documents?doc=${event.documentId}`}>View Document</Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!loading && selectedDayEvents.length === 0 && (
                        <div className="text-center py-8">
                           <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
                           <p className="mt-2 text-sm text-muted-foreground">No events for this day.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
