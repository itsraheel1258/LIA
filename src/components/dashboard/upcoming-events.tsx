"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Document } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, CheckCircle } from "lucide-react";
import {
  format,
  isSameDay,
  parseISO,
  isFuture,
  isPast,
  startOfToday,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

type CalendarEvent = {
  id: string;
  title: string;
  startDate: Date;
  description?: string;
  documentId: string;
};

function EventListItem({ event }: { event: CalendarEvent }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="font-semibold text-sm">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {format(event.startDate, "PPP p")}
        </p>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {event.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="link"
            size="sm"
            asChild
            className="p-0 h-auto text-xs"
          >
            <Link href={`/dashboard/documents?doc=${event.documentId}`}>
              View Document
            </Link>
          </Button>
        </div>
      </div>
      <Badge variant="outline" className="flex-shrink-0">
        {format(event.startDate, "MMM d")}
      </Badge>
    </li>
  );
}

export function UpcomingEvents() {
  const { user, isFirebaseEnabled, db } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseEnabled || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query documents where the event.events array is not empty.
    const documentsQuery = query(
      collection(db, "documents"),
      where("userId", "==", user.uid),
      where("event.found", "==", true),
      orderBy("createdAt", "desc")
    );

    // Query standalone calendar events
    const calendarEventsQuery = query(
      collection(db, "calendarEvents"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeDocuments = onSnapshot(
      documentsQuery,
      (querySnapshot) => {
        const documentEvents: CalendarEvent[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Document;
          if (data.event && data.event.events) {
            data.event.events.forEach((event) => {
              documentEvents.push({
                id: `${doc.id}-${event.title}`,
                title: event.title,
                startDate: parseISO(event.startDate),
                description: event.description || undefined,
                documentId: doc.id,
              });
            });
          }
        });

        // Fetch standalone calendar events
        const unsubscribeCalendar = onSnapshot(
          calendarEventsQuery,
          (calendarSnapshot) => {
            const calendarEvents: CalendarEvent[] = [];
            calendarSnapshot.forEach((doc) => {
              const data = doc.data();
              calendarEvents.push({
                id: `calendar-${doc.id}`,
                title: data.title,
                startDate: parseISO(data.startDate),
                description: data.description || undefined,
                documentId: data.location || "Manual Event", // Use location or indicate it's manual
              });
            });

            // Combine both types of events
            const allEvents = [...documentEvents, ...calendarEvents];
            setEvents(allEvents);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching calendar events: ", error);
            setLoading(false);
          }
        );

        return () => unsubscribeCalendar();
      },
      (error) => {
        console.error("Error fetching document events: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribeDocuments();
  }, [user, isFirebaseEnabled, db]);

  const { upcomingEvents, recentPastEvents } = useMemo(() => {
    const today = startOfToday();
    const upcoming = events
      .filter(
        (event) =>
          isFuture(event.startDate) || isSameDay(event.startDate, today)
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const past = events
      .filter(
        (event) => isPast(event.startDate) && !isSameDay(event.startDate, today)
      )
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .slice(0, 5);
    return { upcomingEvents: upcoming, recentPastEvents: past };
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Upcoming & Recent Events
        </CardTitle>
        <CardDescription>
          A quick look at your time-sensitive documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2 text-primary">
            <Clock className="h-4 w-4" />
            Upcoming Events
          </h4>
          {loading ? (
            <div className="space-y-2">
              <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            <ul className="divide-y">
              {upcomingEvents.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
              {upcomingEvents.length > 5 && (
                <li className="text-sm text-muted-foreground text-center py-4">
                  <Link
                    href="/dashboard/calendar"
                    className="text-primary hover:underline"
                  >
                    View All Events
                  </Link>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming events.
            </p>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            Recent Past Events
          </h4>
          {loading ? (
            <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
          ) : recentPastEvents.length > 0 ? (
            <ul className="divide-y">
              {recentPastEvents.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent events.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
