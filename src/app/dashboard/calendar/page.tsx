
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Document, CalendarEvent as CalendarEventType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, Inbox, Plus, Clock, CheckCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createCalendarEventAction, deleteCalendarEventAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";


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
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    startDate: "",
    endDate: "",
    description: "",
    location: ""
  });
  const { toast } = useToast();

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

    const unsubscribeDocuments = onSnapshot(documentsQuery, (querySnapshot) => {
      const documentEvents: CalendarEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Document;
        // A single document can have multiple events.
        if (data.event && data.event.events) {
          data.event.events.forEach((event: CalendarEventType, index: number) => {
            const uniqueStart = event.startDate || "";
            documentEvents.push({
              id: `doc-${doc.id}-${index}-${uniqueStart}`,
              title: event.title,
              startDate: parseISO(event.startDate),
              endDate: event.endDate ? parseISO(event.endDate) : undefined,
              description: event.description || undefined,
              documentId: doc.id,
            });
          });
        }
      });

      // Fetch standalone calendar events
      const unsubscribeCalendar = onSnapshot(calendarEventsQuery, (calendarSnapshot) => {
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
      }, (error) => {
        console.error("Error fetching calendar events: ", error);
        setLoading(false);
      });

      return () => unsubscribeCalendar();
    }, (error) => {
      console.error("Error fetching document events: ", error);
      setLoading(false);
    });

    return () => unsubscribeDocuments();
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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEvent.title || !newEvent.startDate) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in at least the title and start date."
      });
      return;
    }

    try {
      const result = await createCalendarEventAction({
        userId: user.uid,
        title: newEvent.title,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate || undefined,
        description: newEvent.description || undefined,
        location: newEvent.location || undefined
      });

      if (result.success) {
        toast({
          title: "Event Added!",
          description: "Your event has been added to the calendar."
        });
        setShowAddEventDialog(false);
        setNewEvent({
          title: "",
          startDate: "",
          endDate: "",
          description: "",
          location: ""
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Add Event",
          description: result.error
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred."
      });
    }
  };

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to delete events."
      });
      return;
    }

    try {
      // Check if it's a calendar event or document event
      if (eventId.startsWith('calendar-')) {
        // Delete from calendarEvents collection
        const calendarEventId = eventId.replace('calendar-', '');
        const result = await deleteCalendarEventAction({
          userId: user.uid,
          eventId: calendarEventId
        });

        if (result.success) {
          // Remove from local state
          setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
          toast({
            title: "Event Deleted!",
            description: "The event has been removed from your calendar."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Failed to Delete Event",
            description: result.error || "Could not delete the event."
          });
        }
      } else {
        // For document events, we can't delete them directly as they're part of the document
        // But we can remove them from the local state to hide them from the calendar view
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
        toast({
          title: "Event Removed!",
          description: "The event has been removed from your calendar view. The document remains unchanged."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while deleting the event."
      });
    }
  };

  const { upcomingEvents, recentPastEvents } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    const upcoming = events
      .filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const past = events
      .filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today;
      })
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .slice(0, 5);

    return {
      upcomingEvents: upcoming,
      recentPastEvents: past,
      totalUpcoming: upcoming.length
    };
  }, [events]);

  // Compute displayed upcoming events based on showAllUpcoming state
  const displayedUpcomingEvents = useMemo(() => {
    return showAllUpcoming ? upcomingEvents : upcomingEvents.slice(0, 5);
  }, [upcomingEvents, showAllUpcoming]);

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
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">Events automatically detected from your documents.</p>
          </div>
          <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Quick Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
                <DialogDescription>
                  Create a new calendar event. Events will appear in your upcoming events and calendar view.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Meeting with team"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Brief description of the event"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Conference Room A"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddEventDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Event
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Delete Event Confirmation Dialog */}
        <Dialog open={!!deletingEvent} onOpenChange={() => setDeletingEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this event? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingEvent(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deletingEvent) {
                    const event = events.find(e => e.id === deletingEvent);
                    if (event) {
                      deleteEvent(deletingEvent, event.title);
                      setDeletingEvent(null);
                    }
                  }
                }}
              >
                Delete Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                    day: "text-center",
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
          </div>

          <Card className="lg:col-span-1 sticky top-20">
            <Tabs defaultValue="daily" className="w-full">
              <CardHeader className="pb-3">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="daily" className="space-y-4">
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-medium mb-3">
                    Events for {selectedDate ? format(selectedDate, "PPP") : '...'}
                  </h3>

                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {!loading && selectedDayEvents.length > 0 && (
                    <ul className="space-y-3">
                      {selectedDayEvents.map(event => (
                        <li key={event.id} className="p-3 rounded-md border bg-muted/20">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{event.title}</p>
                              <p className="text-xs text-muted-foreground">{formatEventTime(event.startDate, event.endDate)}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                <Link href={`/dashboard/documents?doc=${event.documentId}`}>View Document</Link>
                              </Button>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingEvent(event.id)}
                                    disabled={deletingEvent === event.id}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                                  >
                                    {deletingEvent === event.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete Event</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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
                </div>
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4">
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Upcoming Events
                  </h3>

                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
                      <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
                    </div>
                  ) : displayedUpcomingEvents.length > 0 ? (
                    <>
                      <ul className="space-y-3">
                        {displayedUpcomingEvents.map(event => (
                          <li
                            key={event.id} className="p-3 rounded-md border bg-muted/20">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{event.title}</p>
                                <p className="text-xs text-muted-foreground">{formatEventTime(event.startDate, event.endDate)}</p>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                )}
                                <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                  <Link href={`/dashboard/documents?doc=${event.documentId}`}>View Document</Link>
                                </Button>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletingEvent(event.id)}
                                      disabled={deletingEvent === event.id}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                                    >
                                      {deletingEvent === event.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete Event</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {upcomingEvents.length > 5 && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                            className="w-full"
                          >
                            {showAllUpcoming ? 'Show Less' : `View All Events (${upcomingEvents.length})`}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming events.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="recent" className="space-y-4">
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    Recent Past Events
                  </h3>

                  {loading ? (
                    <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
                  ) : recentPastEvents.length > 0 ? (
                    <ul className="space-y-3">
                      {recentPastEvents.map(event => (
                        <li key={event.id} className="p-3 rounded-md border bg-muted/20">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{event.title}</p>
                              <p className="text-xs text-muted-foreground">{formatEventTime(event.startDate, event.endDate)}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                <Link href={`/dashboard/documents?doc=${event.documentId}`}>View Document</Link>
                              </Button>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingEvent(event.id)}
                                    disabled={deletingEvent === event.id}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                                  >
                                    {deletingEvent === event.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete Event</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent events.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
