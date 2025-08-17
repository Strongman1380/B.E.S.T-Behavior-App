import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function ContactLogFormDialog({ open, onOpenChange, onSave, students }) {
    const [formData, setFormData] = useState({
        student_id: '',
        contact_date: new Date(),
        contact_person_name: '',
        contact_category: '',
        purpose_of_contact: '',
        outcome_of_contact: '',
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        const dataToSave = {
            ...formData,
            contact_date: format(formData.contact_date, 'yyyy-MM-dd'),
        };
        onSave(dataToSave);
        // Reset form for next entry
        setFormData({
            student_id: '',
            contact_date: new Date(),
            contact_person_name: '',
            contact_category: '',
            purpose_of_contact: '',
            outcome_of_contact: '',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add New Contact Log</DialogTitle>
                    <DialogDescription>
                        Document a new communication. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="space-y-2">
                        <Label>Student</Label>
                        <Select value={formData.student_id} onValueChange={value => handleChange('student_id', value)}>
                            <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                            <SelectContent>
                                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date of Contact</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.contact_date ? format(formData.contact_date, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.contact_date} onSelect={date => handleChange('contact_date', date)} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                             <Label>Contact Person</Label>
                             <Input value={formData.contact_person_name} onChange={e => handleChange('contact_person_name', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.contact_category} onValueChange={value => handleChange('contact_category', value)}>
                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Student">Student</SelectItem>
                                <SelectItem value="Family">Family</SelectItem>
                                <SelectItem value="Teacher">Teacher</SelectItem>
                                <SelectItem value="Counselor">Counselor</SelectItem>
                                <SelectItem value="Mental Health Provider">Mental Health Provider</SelectItem>
                                <SelectItem value="CPS">CPS</SelectItem>
                                <SelectItem value="Community Agency">Community Agency</SelectItem>
                                <SelectItem value="Legal">Legal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Purpose of Contact</Label>
                        <Textarea value={formData.purpose_of_contact} onChange={e => handleChange('purpose_of_contact', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Outcome/Action Items</Label>
                        <Textarea value={formData.outcome_of_contact} onChange={e => handleChange('outcome_of_contact', e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Log</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}