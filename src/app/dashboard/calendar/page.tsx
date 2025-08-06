
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, FileText, Loader2, AlertTriangle, Inbox } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const { user, isFirebaseEnabled, db } = useAuth();
  const [events, setEvents] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!user || !isFirebaseEnabled || !db) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const q = query(
        collection(db, "documents"), 
        where("userId", "==", user.uid),
        where("event.found", "==", true), // Only fetch documents with events
        orderBy("event.startDate", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: Document[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate() 
        } as Document);
      });
      setEvents(docs);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching events: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isFirebaseEnabled, db]);

  const eventDays = useMemo(() => {
    return events.map(event => new Date(event.event!.startDate!));
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(new Date(event.event!.startDate!), selectedDate));
  }, [events, selectedDate]);


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
            <Card className="lg:col-span-2">
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

            <Card className="lg:col-span-1">
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
                                    <p className="font-semibold text-sm">{event.event?.title}</p>
                                    <p className="text-xs text-muted-foreground">{event.event?.description}</p>
                                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                        <a href={`/dashboard/documents?doc=${event.id}`} target="_blank" rel="noopener noreferrer">View Document</a>
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
