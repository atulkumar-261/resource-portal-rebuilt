import type { Resource, Client, Project, Task, Leave, Timesheet, Payslip, Announcement } from "./types";

export const initialResources: Resource[] = [
  { id: "177", fullName: "Asra Ghafoor", jobTitle: "Analyst Programmer", email: "asra.ghafoor@magnificit.co.uk", employeeId: "YDS00", skillset: "Analyst Programmer with experience in transactional systems and enterprise-grade solutions.", phone: "+44 7425832612", address: "09, Park View, Dewsbury, West Yorkshire, WF12 9DT", citizenOf: "Indian", passportNumber: "V3661563", passportExpiry: "31-01-2032", visaNumber: "", visaExpiry: "30-11-2027", niNumber: "TL055400A", dob: "15-05-1988", bankAccount: "12898366", sortCode: "11-02-38", bankName: "HALIFAX", emergencyName: "Ayub A. Badsha", emergencyPhone: "+966 544263900", emergencyEmail: "syedayubahmed@gmail.com", emergencyAddress: "Riyadh, Saudi Arabia", status: "active" },
  { id: "178", fullName: "Supriya Dalli", jobTitle: "SQL Developer", email: "supriya.dalli@magnificit.co.uk", employeeId: "YDS01", skillset: "SQL development, data integrity, query optimization.", phone: "+44 7700900111", address: "12 High Street, London, E1 6AN", citizenOf: "Indian", passportNumber: "M7234567", passportExpiry: "12-08-2030", visaNumber: "V998877", visaExpiry: "15-09-2026", niNumber: "AB123456C", dob: "22-03-1990", bankAccount: "33445566", sortCode: "20-00-00", bankName: "Barclays", emergencyName: "Ramesh Dalli", emergencyPhone: "+91 9876543210", emergencyEmail: "ramesh@example.com", emergencyAddress: "Mumbai, India", status: "active" },
  { id: "179", fullName: "Jimy Shine", jobTitle: "Full Stack Developer", email: "jimy.shine@magnificit.co.uk", employeeId: "YDS02", skillset: "React, Node.js, cross-functional collaboration.", phone: "+44 7700900112", address: "5 Oak Lane, Birmingham, B1 1AA", citizenOf: "British", passportNumber: "GB1122334", passportExpiry: "05-05-2031", visaNumber: "", visaExpiry: "", niNumber: "CD789012E", dob: "10-11-1992", bankAccount: "55667788", sortCode: "30-00-00", bankName: "Lloyds", emergencyName: "Mary Shine", emergencyPhone: "+44 7700900200", emergencyEmail: "mary@example.com", emergencyAddress: "Birmingham, UK", status: "active" },
  { id: "180", fullName: "Himabindu Bashapaka", jobTitle: "Data Analyst", email: "hima.b@magnificit.co.uk", employeeId: "YDS03", skillset: "Statistical analysis, SQL, data interpretation.", phone: "+44 7700900113", address: "44 Maple Road, Manchester, M1 2AB", citizenOf: "Indian", passportNumber: "N5566778", passportExpiry: "20-02-2029", visaNumber: "V776655", visaExpiry: "01-12-2026", niNumber: "EF345678G", dob: "08-07-1991", bankAccount: "77889900", sortCode: "40-00-00", bankName: "HSBC", emergencyName: "Krishna B.", emergencyPhone: "+91 9988776655", emergencyEmail: "krishna@example.com", emergencyAddress: "Hyderabad, India", status: "active" },
  { id: "181", fullName: "Gouthami Masam", jobTitle: "Data Analyst", email: "gouthami.m@magnificit.co.uk", employeeId: "YDS04", skillset: "Power BI, Excel reporting, business intelligence.", phone: "+44 7700900114", address: "21 Elm Street, Leeds, LS1 4AB", citizenOf: "Indian", passportNumber: "P9988776", passportExpiry: "18-06-2032", visaNumber: "V554433", visaExpiry: "20-08-2027", niNumber: "GH901234I", dob: "14-09-1993", bankAccount: "11223344", sortCode: "50-00-00", bankName: "NatWest", emergencyName: "Raju Masam", emergencyPhone: "+91 9876512345", emergencyEmail: "raju@example.com", emergencyAddress: "Vijayawada, India", status: "active" },
  { id: "182", fullName: "CHANDU THOTA", jobTitle: "Web Developer", email: "chandu.t@magnificit.co.uk", employeeId: "YDS05", skillset: "Frontend optimization, scalable web apps.", phone: "+44 7700900115", address: "7 River Walk, Glasgow, G1 1XX", citizenOf: "Indian", passportNumber: "Q1234567", passportExpiry: "11-03-2028", visaNumber: "V332211", visaExpiry: "10-10-2026", niNumber: "IJ567890K", dob: "19-12-1989", bankAccount: "99887766", sortCode: "60-00-00", bankName: "Santander", emergencyName: "Lakshmi Thota", emergencyPhone: "+91 9123456780", emergencyEmail: "lakshmi@example.com", emergencyAddress: "Hyderabad, India", status: "active" },
  { id: "183", fullName: "Prateek Sharma", jobTitle: "Business Analyst", email: "prateek.s@magnificit.co.uk", employeeId: "YDS06", skillset: "Deep-dive analysis, trends and risk identification.", phone: "+44 7700900116", address: "16 Bridge Road, Bristol, BS1 5TR", citizenOf: "Indian", passportNumber: "R8765432", passportExpiry: "25-11-2030", visaNumber: "", visaExpiry: "", niNumber: "KL123456M", dob: "03-04-1990", bankAccount: "22334455", sortCode: "70-00-00", bankName: "Halifax", emergencyName: "Anita Sharma", emergencyPhone: "+91 9988123456", emergencyEmail: "anita@example.com", emergencyAddress: "Delhi, India", status: "active" },
  { id: "184", fullName: "Emmanuel Joseph Raghupathy", jobTitle: "Network Engineer", email: "emmanuel.jr@magnificit.co.uk", employeeId: "YDS07", skillset: "Network integration with servers and applications.", phone: "+44 7700900117", address: "23 ROBERTS ROAD Southampton, SO15 1AA", citizenOf: "Indian", passportNumber: "I0587814", passportExpiry: "28-07-2035", visaNumber: "V889900", visaExpiry: "30-06-2026", niNumber: "MN789012O", dob: "26-06-1987", bankAccount: "33221100", sortCode: "80-00-00", bankName: "Metro Bank", emergencyName: "Joseph R.", emergencyPhone: "+91 9876012345", emergencyEmail: "joseph@example.com", emergencyAddress: "Chennai, India", status: "active" },
];

export const initialClients: Client[] = [
  { id: "c1", name: "Acme Corporation", contactPerson: "John Smith", email: "john@acme.com", phone: "+44 2079460000", address: "10 Downing Street, London, SW1A 2AA" },
  { id: "c2", name: "Beta Industries", contactPerson: "Sarah Lee", email: "sarah@beta.io", phone: "+44 2079461111", address: "200 Aldersgate, London, EC1A 4HD" },
  { id: "c3", name: "Gamma Solutions", contactPerson: "Michael Brown", email: "michael@gamma.co.uk", phone: "+44 1612345678", address: "1 Spinningfields, Manchester, M3 3AP" },
  { id: "c4", name: "Delta Systems", contactPerson: "Emily Davis", email: "emily@delta.com", phone: "+44 1183456789", address: "Reading Bridge House, Reading, RG1 8LS" },
];

export const initialProjects: Project[] = [
  { id: "p1", name: "LMS", client: "Acme Corporation", startDate: "01-01-2026", endDate: "31-12-2026", status: "active", description: "Learning Management System for client teams." },
  { id: "p2", name: "Training", client: "Beta Industries", startDate: "01-02-2026", endDate: "30-11-2026", status: "active", description: "Internal training & upskilling platform." },
  { id: "p3", name: "CRM Migration", client: "Gamma Solutions", startDate: "15-03-2026", endDate: "30-09-2026", status: "active", description: "Salesforce to in-house CRM migration." },
  { id: "p4", name: "Mobile App", client: "Delta Systems", startDate: "01-04-2026", endDate: "31-12-2026", status: "on-hold", description: "iOS/Android consumer app." },
];

const tasksSeed: Array<[string, string, string, string, "completed" | "in-progress" | "pending"]> = [
  ["Troubleshoot and resolve SQL issues", "178", "LMS", "13-04-2026", "in-progress"],
  ["Optimize application performance and ensure system reliability", "177", "LMS", "13-04-2026", "in-progress"],
  ["Work with cross-functional teams to deliver high-quality features", "179", "LMS", "13-04-2026", "in-progress"],
  ["Use statistical techniques to analyze and interpret data", "180", "Training", "13-04-2026", "in-progress"],
  ["Use tools like Power BI or Excel for reporting and dashboards", "181", "Training", "13-04-2026", "in-progress"],
  ["Optimize websites for speed, performance, and scalability", "182", "Training", "13-04-2026", "completed"],
  ["Perform deep-dive analysis to identify trends, risks and opportunities", "183", "Training", "13-04-2026", "completed"],
  ["Integrate network systems with servers and applications", "184", "Training", "13-04-2026", "completed"],
  ["Analyze data trends using SQL", "178", "LMS", "06-04-2026", "completed"],
  ["Perform system analysis, testing, and debugging", "177", "LMS", "06-04-2026", "completed"],
  ["Conduct code reviews and ensure coding standards", "179", "LMS", "06-04-2026", "completed"],
  ["Work with SQL to extract and manipulate data efficiently", "180", "Training", "06-04-2026", "completed"],
];

export const initialTasks: Task[] = tasksSeed.map((t, i) => {
  const res = initialResources.find((r) => r.id === t[1]);
  return {
    id: `t${i + 1}`,
    subject: t[0],
    resourceId: t[1],
    resourceName: res?.fullName ?? "Unknown",
    project: t[2],
    startDate: t[3],
    status: t[4],
    notes: `${t[0]}. Detailed notes on task progress and approach.`,
  };
});

export const initialLeaves: Leave[] = [
  { id: "l1", resourceId: "177", resourceName: "Asra Ghafoor", fromDate: "15-03-2026", toDate: "15-03-2026", totalDays: 1, type: "Annual", reason: "Personal", status: "approved" },
  { id: "l2", resourceId: "177", resourceName: "Asra Ghafoor", fromDate: "20-01-2026", toDate: "21-01-2026", totalDays: 2, type: "Sick", reason: "Flu", status: "approved" },
  { id: "l3", resourceId: "178", resourceName: "Supriya Dalli", fromDate: "10-04-2026", toDate: "10-04-2026", totalDays: 1, type: "Casual", reason: "Family event", status: "pending" },
  { id: "l4", resourceId: "180", resourceName: "Himabindu Bashapaka", fromDate: "05-05-2026", toDate: "07-05-2026", totalDays: 3, type: "Annual", reason: "Vacation", status: "pending" },
];

export const initialTimesheets: Timesheet[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `ts${i + 1}`,
  resourceId: "177",
  resourceName: "Asra Ghafoor",
  weekNumber: 15 - i,
  weekEndDate: ["12/Apr/2026", "05/Apr/2026", "29/Mar/2026", "22/Mar/2026", "15/Mar/2026", "08/Mar/2026", "01/Mar/2026", "22/Feb/2026", "15/Feb/2026", "08/Feb/2026"][i],
  totalHours: 35,
  status: "approved",
}));

export const initialPayslips: Payslip[] = [
  { id: "ps1", resourceId: "177", resourceName: "Asra Ghafoor", month: "March 2026", days: 22, notes: "Regular salary", amount: 3200 },
  { id: "ps2", resourceId: "178", resourceName: "Supriya Dalli", month: "March 2026", days: 22, notes: "Regular salary", amount: 3100 },
  { id: "ps3", resourceId: "179", resourceName: "Jimy Shine", month: "March 2026", days: 22, notes: "Regular salary + bonus", amount: 3600 },
];

export const initialAnnouncements: Announcement[] = [
  { id: "a1", subject: "Office Closed on Bank Holiday", message: "Please note the office will remain closed on 27th May 2026 for the spring bank holiday.", date: "20-05-2026" },
  { id: "a2", subject: "New Health Insurance Policy", message: "Updated health insurance plans are effective from 1st April. Check your inbox for details.", date: "28-03-2026" },
  { id: "a3", subject: "Quarterly All-Hands", message: "Join the all-hands meeting on Friday 4pm in the main hall.", date: "10-04-2026" },
];
