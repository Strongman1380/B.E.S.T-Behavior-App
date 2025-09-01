import React, { useState, useEffect } from 'react';
import { Student } from '@/api/entities';
import { ContactLog } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import ContactLogFormDialog from '../components/contacts/ContactLogFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactLogs() {
    const [students, setStudents] = useState([]);
    const [contactLogs, setContactLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const studentMap = React.useMemo(() => new Map(students.map(s => [s.id, s.student_name])), [students]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [studentList, logList] = await Promise.all([
                Student.list(),
                ContactLog.list('-contact_date')
            ]);
            setStudents(studentList);
            setContactLogs(logList);
        } catch (error) {
            const msg = typeof error?.message === 'string' ? error.message : ''
            if (msg.includes('Supabase not configured')) {
              toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
            } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('row-level security')) {
              toast.error('RLS/permissions preventing reads. Apply supabase-schema.sql policies/grants in Supabase.')
            } else {
              toast.error("Failed to fetch data.");
            }
        }
        setIsLoading(false);
    };

    const handleSaveLog = async (logData) => {
        try {
            await ContactLog.create(logData);
            toast.success("Contact log saved successfully.");
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            const msg = typeof error?.message === 'string' ? error.message : ''
            if (msg.includes('Supabase not configured')) {
              toast.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy.')
            } else if (msg.toLowerCase().includes('row-level security')) {
              toast.error('Insert blocked by RLS. Apply supabase-schema.sql policies/grants in Supabase.')
            } else if (msg.toLowerCase().includes('permission') || error?.code === '42501') {
              toast.error('Permission denied. Check RLS policies for anon role in Supabase.')
            } else {
              toast.error("Failed to save contact log.");
            }
        }
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 lg:p-10 bg-slate-50 min-h-screen">
            <Toaster richColors />
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col gap-4 mb-6 sm:mb-8 lg:mb-10">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800">Contact Logs</h1>
                            <p className="text-sm sm:text-base lg:text-lg text-slate-500">
                                <span className="hidden sm:inline">A centralized record of all communications.</span>
                                <span className="sm:hidden">Communication records</span>
                            </p>
                        </div>
                        <Button 
                            onClick={() => setIsFormOpen(true)}
                            className="h-10 sm:h-11 w-full sm:w-auto"
                        >
                            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            <span className="hidden sm:inline">Add New Log</span>
                            <span className="sm:hidden">Add Log</span>
                        </Button>
                    </div>
                </header>
            
            {/* Desktop Table View */}
            <div className="bg-white rounded-lg shadow-md hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Contact Person</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Purpose</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan="5" className="text-center py-10">Loading logs...</TableCell></TableRow>
                        ) : contactLogs.length === 0 ? (
                            <TableRow><TableCell colSpan="5" className="text-center py-10">No contact logs found. Add one to get started.</TableCell></TableRow>
                        ) : (
                            contactLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{studentMap.get(log.student_id) || 'Unknown Student'}</TableCell>
                                    <TableCell>{format(new Date(log.contact_date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{log.contact_person_name}</TableCell>
                                    <TableCell><Badge variant="outline">{log.contact_category}</Badge></TableCell>
                                    <TableCell className="max-w-xs truncate">{log.purpose_of_contact}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 sm:space-y-4">
                  {isLoading ? (
                      <div className="text-center py-8 sm:py-10">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-slate-600">Loading logs...</p>
                      </div>
                  ) : contactLogs.length === 0 ? (
                      <div className="text-center py-8 sm:py-10 bg-white rounded-lg shadow-md">
                          <p className="text-slate-600">No contact logs found.</p>
                          <Button 
                              onClick={() => setIsFormOpen(true)}
                              className="mt-4"
                          >
                              <PlusCircle className="w-4 h-4 mr-2" />
                              Add First Log
                          </Button>
                      </div>
                  ) : (
                      contactLogs.map(log => (
                          <Card key={log.id} className="bg-white shadow-md">
                              <CardHeader className="pb-3 p-3 sm:p-4">
                                  <CardTitle className="text-base sm:text-lg">{studentMap.get(log.student_id) || 'Unknown'}</CardTitle>
                                  <p className="text-xs sm:text-sm text-slate-500">{format(new Date(log.contact_date), 'MMM d, yyyy')}</p>
                              </CardHeader>
                              <CardContent className="space-y-2 sm:space-y-3 text-sm p-3 sm:p-4 pt-0">
                                  <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Person</p>
                                      <p className="text-sm">{log.contact_person_name}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</p>
                                      <Badge variant="outline" className="mt-1 text-xs">{log.contact_category}</Badge>
                                  </div>
                                  <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purpose</p>
                                      <p className="text-sm line-clamp-3">{log.purpose_of_contact}</p>
                                  </div>
                              </CardContent>
                          </Card>
                      ))
                  )}
                </div>
            </div>
            
            <ContactLogFormDialog 
                open={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                onSave={handleSaveLog} 
                students={students}
            />
        </div>
    );
}
