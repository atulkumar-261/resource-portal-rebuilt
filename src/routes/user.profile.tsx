import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useRMS } from "@/lib/store";
import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Loader2, UploadCloud } from "lucide-react";
import { fetchSelfProfileCompletion, updateSelfProfile, changePassword, uploadResourceDocument, fetchResourceDocuments, deleteResourceDocument, type ProfileCompletionResponse, type ResourceDocument } from "@/lib/api/resources";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const Route = createFileRoute("/user/profile")({ component: MyProfile });

function MyProfile() {
  const resourceId = useAuth((s) => s.resourceId);
  const onboardingStatus = useAuth((s) => s.onboardingStatus);
  const setOnboardingStatus = useAuth((s) => s.setOnboardingStatus);
  const resourceFromStore = useRMS((s) => s.resources.find((r) => r.id === resourceId));
  const allResources = useRMS((s) => s.resources);
  const resource = resourceFromStore ?? allResources[0];
  const update = useRMS((s) => s.updateResource);

  // Profile completion state
  const [completionData, setCompletionData] = useState<ProfileCompletionResponse | null>(null);

  // Document Fetching
  const queryClient = useQueryClient();
  const { data: documents = [] } = useQuery({
    queryKey: ["resource-documents", resource?.id],
    queryFn: () => fetchResourceDocuments(resource!.id),
    enabled: !!resource?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ type, file }: { type: string; file: File }) => uploadResourceDocument(resource!.id, type, file),
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["resource-documents", resource?.id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to upload document"),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => deleteResourceDocument(id),
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["resource-documents", resource?.id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete document"),
  });

  useEffect(() => {
    fetchSelfProfileCompletion()
      .then((data) => {
        setCompletionData(data);
        if (data.onboarding_status && data.onboarding_status !== onboardingStatus) {
          setOnboardingStatus(data.onboarding_status);
        }
      })
      .catch(() => {
        // Backend unavailable — no banner shown
      });
  }, []);

  // Form states matching fields
  const [fullName, setFullName] = useState(resource?.fullName || "");
  const [jobTitle, setJobTitle] = useState(resource?.jobTitle || "");
  const [email, setEmail] = useState(resource?.email || "");
  const [notes, setNotes] = useState(resource?.performanceNotes || "");
  const [skillset, setSkillset] = useState(resource?.skillset || "");
  const [otherInfo, setOtherInfo] = useState(resource?.otherInfo || "");

  // Bank Details states
  const [bankAccount, setBankAccount] = useState(resource?.bankAccount || "");
  const [sortCode, setSortCode] = useState(resource?.sortCode || "");
  const [bankName, setBankName] = useState(resource?.bankName || "");

  // Personal Details states
  const [dob, setDob] = useState(resource?.dob || "");
  const [passportNumber, setPassportNumber] = useState(resource?.passportNumber || "");
  const [passportExpiry, setPassportExpiry] = useState(resource?.passportExpiry || "");
  const [visaNumber, setVisaNumber] = useState(resource?.visaNumber || "");
  const [visaExpiry, setVisaExpiry] = useState(resource?.visaExpiry || "");
  const [niNumber, setNiNumber] = useState(resource?.niNumber || "");
  const [citizenOf, setCitizenOf] = useState(resource?.citizenOf || "");
  const [phone, setPhone] = useState(resource?.phone || "");
  const [address, setAddress] = useState(resource?.address || "");

  // Emergency Contact Details states
  const [emergencyName, setEmergencyName] = useState(resource?.emergencyName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(resource?.emergencyPhone || "");
  const [emergencyEmail, setEmergencyEmail] = useState(resource?.emergencyEmail || "");
  const [emergencyAddress, setEmergencyAddress] = useState(resource?.emergencyAddress || "");

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  // File Upload Helper
  const handleFileUpload = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (fieldName === "avatarUrl") {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            update(resource.id, { avatarUrl: reader.result });
          }
        };
        reader.readAsDataURL(file);
      } else {
        update(resource.id, { [fieldName]: file.name });
      }
    }
  };

  const [saving, setSaving] = useState(false);

  // Form Submit Handler — calls backend API, falls back to mock store
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await updateSelfProfile({
        phone: phone || undefined,
        dob: dob || undefined,
        ni_number: niNumber || undefined,
        nationality: citizenOf || undefined,
        passport_number: passportNumber || undefined,
        passport_expiry: passportExpiry || undefined,
        visa_number: visaNumber || undefined,
        visa_expiry: visaExpiry || undefined,
        skillset: skillset || undefined,
        other_info: otherInfo || undefined,
        current_address: address || undefined,
        emergency_contact_name: emergencyName || undefined,
        emergency_contact_phone: emergencyPhone || undefined,
        emergency_contact_email: emergencyEmail || undefined,
        emergency_contact_address: emergencyAddress || undefined,
        bank_name: bankName || undefined,
        account_number: bankAccount || undefined,
        sort_code: sortCode || undefined,
      });
      // Update completion data from response
      setCompletionData({
        resource_id: result.resource_id,
        profile_completion_percentage: result.profile_completion_percentage,
        onboarding_status: result.onboarding_status,
        missing_fields: result.missing_fields,
      });
      // Update auth store onboarding status to unlock routes
      if (result.onboarding_status) {
        setOnboardingStatus(result.onboarding_status);
      }
      toast.success("Profile saved successfully!");
    } catch {
      // Fallback to mock store
      update(resource.id, {
        fullName, jobTitle, email, performanceNotes: notes, skillset, otherInfo,
        bankAccount, sortCode, bankName, dob, passportNumber, passportExpiry,
        visaNumber, visaExpiry, niNumber, citizenOf, phone, address,
        emergencyName, emergencyPhone, emergencyEmail, emergencyAddress,
      });
      toast.success("Profile saved locally (backend unavailable).");
    } finally {
      setSaving(false);
    }
  };

  // Password Submit Handler — calls backend API
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New password and confirm password do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus("New password must be at least 6 characters.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus(null);
    } catch (err: any) {
      setPasswordStatus(err?.message || "Failed to change password.");
    }
  };

  const completionPct = completionData?.profile_completion_percentage ?? 0;
  const missingFields = completionData?.missing_fields ?? [];
  const showBanner = completionData && completionData.onboarding_status === "pending";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Heading */}
      <h1 className="text-[26px] font-normal text-[#0e7770] mb-4">My Profile</h1>

      {/* ── Onboarding Completion Banner ── */}
      {showBanner && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm mb-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-800 mb-1">Profile Onboarding Incomplete</h3>
              <p className="text-xs text-amber-700 mb-3">
                Your profile is <strong>{completionPct}%</strong> complete. You need at least <strong>80%</strong> to unlock all system features.
              </p>
              {/* Progress bar */}
              <div className="w-full bg-amber-200 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPct}%`,
                    background: completionPct >= 80 ? "#16a34a" : completionPct >= 40 ? "#d97706" : "#dc2626",
                  }}
                />
              </div>
              {/* Missing fields checklist */}
              {missingFields.length > 0 && (
                <div className="text-xs text-amber-800">
                  <span className="font-semibold mb-1 block">Missing Fields:</span>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {missingFields.map((f) => (
                      <li key={f} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {completionData && completionData.onboarding_status === "completed" && (
        <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-md shadow-sm mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            Profile onboarding complete — {completionPct}% filled
          </span>
        </div>
      )}

      {/* Unified Grey Block Container */}
      <div className="bg-[#636363] text-white p-6 shadow-lg space-y-6 rounded-none">
        {/* Top Segment containing 3 side-by-side columns */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Profile Input Fields (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-3.5 text-xs">
            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Full Name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Job Title:</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Email Address:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-start">
              <label className="w-36 font-normal text-slate-100 shrink-0 pt-1">Notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none min-h-[50px] resize-y"
              />
            </div>

            <div className="flex items-start">
              <label className="w-36 font-normal text-slate-100 shrink-0 pt-1">Skillset:</label>
              <textarea
                value={skillset}
                onChange={(e) => setSkillset(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none min-h-[55px] resize-y"
              />
            </div>

            {/* Upload Profile Picture */}
            <div className="flex items-center">
              <div className="w-36 flex flex-col shrink-0">
                <span className="font-normal text-slate-100">Profile Picture:</span>
                <span className="text-[9px] text-slate-300">Supports JPG, PNG, GIF</span>
              </div>
              <label className="bg-white hover:bg-slate-100 text-black px-3 py-1 border border-black rounded-none text-[11px] font-semibold cursor-pointer transition-colors">
                Upload Profile Picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload("avatarUrl", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Upload CV */}
            <div className="flex items-center">
              <div className="w-36 flex flex-col shrink-0">
                <span className="font-normal text-slate-100">Upload CV:</span>
                <span className="text-[9px] text-slate-300">Supports PDF, doc, docx</span>
              </div>
              <label className="bg-white hover:bg-slate-100 text-black px-3 py-1 border border-black rounded-none text-[11px] font-semibold cursor-pointer transition-colors">
                Upload CV
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileUpload("cvName", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Passport Copy */}
            <div className="flex items-center">
              <div className="w-36 flex flex-col shrink-0">
                <span className="font-normal text-slate-100">Passport Copy:</span>
                <span className="text-[9px] text-slate-300">Supports PDF, DOC, DOCX, JPG, PNG, GIF</span>
              </div>
              <label className="bg-white hover:bg-slate-100 text-black px-3 py-1 border border-black rounded-none text-[11px] font-semibold cursor-pointer transition-colors">
                Upload Passport
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => handleFileUpload("passportCopyName", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Visa Copy */}
            <div className="flex items-center">
              <div className="w-36 flex flex-col shrink-0">
                <span className="font-normal text-slate-100">Visa Copy:</span>
                <span className="text-[9px] text-slate-300">Supports PDF, DOC, DOCX, JPG, PNG, GIF</span>
              </div>
              <label className="bg-white hover:bg-slate-100 text-black px-3 py-1 border border-black rounded-none text-[11px] font-semibold cursor-pointer transition-colors">
                Upload Visa
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => handleFileUpload("visaCopyName", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Holiday Sheet */}
            <div className="flex items-center">
              <div className="w-36 flex flex-col shrink-0">
                <span className="font-normal text-slate-100">Holiday Sheet:</span>
                <span className="text-[9px] text-slate-300">Supports PDF, xls, xlsx</span>
              </div>
              <label className="bg-white hover:bg-slate-100 text-black px-3 py-1 border border-black rounded-none text-[11px] font-semibold cursor-pointer transition-colors">
                Upload Holiday Sheet
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx"
                  onChange={(e) => handleFileUpload("holidaySheetName", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Other Documents */}
            <div className="flex items-center">
              <div className="w-36 flex flex-col shrink-0">
                <span className="font-normal text-slate-100">Other/Academic Certificates:</span>
                <span className="text-[9px] text-slate-300">Supports PDF, doc, docx, xls, xlsx</span>
              </div>
              <label className="bg-white hover:bg-slate-100 text-black px-3 py-1 border border-black rounded-none text-[11px] font-semibold cursor-pointer transition-colors">
                Upload Other documents
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => handleFileUpload("otherDocsName", e)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-start">
              <label className="w-36 font-normal text-slate-100 shrink-0 pt-1">Other Info:</label>
              <textarea
                value={otherInfo}
                onChange={(e) => setOtherInfo(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none min-h-[50px] resize-y"
              />
            </div>
          </div>

          {/* Column 2: Document previews / statuses (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4 text-xs lg:border-l lg:border-slate-500 lg:pl-6">
            <div>
              <span className="font-semibold text-slate-100 block mb-1 text-[11px]">
                Current Profile Pic
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-24 border border-black bg-stone-200 flex items-center justify-center overflow-hidden relative">
                  {resource?.avatarUrl ? (
                    <img
                      src={resource.avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-500 text-[10px]">No Pic</span>
                  )}
                </div>
                {resource?.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => update(resource.id, { avatarUrl: "" })}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5"
                    title="Remove Profile Pic"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="font-bold text-slate-100 block pt-1 border-b border-slate-600 pb-2 mb-4">
              Employee ID: {resource?.employeeId || "—"}
            </div>

            {/* Document Upload Fields */}
            <div className="space-y-4">
              {[
                { type: "cv", label: "Current CV" },
                { type: "passport_copy", label: "Passport Copy" },
                { type: "visa_copy", label: "Visa Copy" },
                { type: "holiday_sheet", label: "Holiday Sheet" },
                { type: "other_docs", label: "Other/Academic Certificates" }
              ].map(docType => {
                const existingDoc = documents.find(d => d.document_type === docType.type);
                const isUploading = uploadMutation.isPending && uploadMutation.variables?.type === docType.type;
                return (
                  <div key={docType.type} className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-slate-100 text-xs">{docType.label}:</span>
                      {existingDoc ? (
                        <div className="flex items-center gap-1 bg-[#505050] px-1.5 py-0.5 rounded-sm flex-1 min-w-0 justify-between">
                          <span className="text-slate-100 text-[10px] font-mono truncate" title={existingDoc.file_name}>
                            {existingDoc.file_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteDocMutation.mutate(existingDoc.id)}
                            disabled={deleteDocMutation.isPending}
                            className="text-red-400 hover:text-red-500 disabled:opacity-50 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-red-400 italic font-mono text-[10px]">Not uploaded</span>
                          <label className={`cursor-pointer bg-teal-700 hover:bg-teal-600 text-white px-2 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                            Upload
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  uploadMutation.mutate({ type: docType.type, file: e.target.files[0] });
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Change Password Block (lg:col-span-3) */}
          <div className="lg:col-span-3 bg-[#505050] p-4 border border-[#444] space-y-4 rounded-none h-fit">
            <h2 className="text-[16px] font-normal text-[#0d7a70] border-b border-slate-500 pb-1.5">
              Change Password
            </h2>

            {passwordStatus && (
              <div className="text-[11px] bg-red-900/40 text-red-200 p-2 rounded-none border border-red-500">
                {passwordStatus}
              </div>
            )}

            <div className="space-y-1 text-xs">
              <label className="font-normal text-slate-200">Current Password:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-normal text-slate-200">New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-normal text-slate-200">Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex gap-2.5 pt-2 text-xs">
              <button
                type="button"
                onClick={handlePasswordSave}
                className="bg-white hover:bg-slate-100 text-black px-3.5 py-1 border border-black rounded-none font-semibold cursor-pointer transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordStatus(null);
                }}
                className="bg-white hover:bg-slate-100 text-black px-3.5 py-1 border border-black rounded-none font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <hr className="border-slate-500 my-4" />

        {/* Bank Details Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold tracking-wide border-b border-slate-500 pb-1 text-slate-200 uppercase">
            Bank Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Account No.:</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Sort Code:</label>
              <input
                type="text"
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-start md:col-span-2">
              <label className="w-36 font-normal text-slate-100 shrink-0 pt-1">
                Bank Name and Address:
              </label>
              <textarea
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none min-h-[60px] resize-y"
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-500 my-4" />

        {/* Personal Details Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold tracking-wide border-b border-slate-500 pb-1 text-slate-200 uppercase">
            Personal Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Date Of Birth:</label>
              <div className="flex-grow flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-300">(DD-MM-YYYY)</span>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Passport Number:</label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Passport Expiry Date:</label>
              <div className="flex-grow flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-300">(DD-MM-YYYY)</span>
                <input
                  type="text"
                  value={passportExpiry}
                  onChange={(e) => setPassportExpiry(e.target.value)}
                  className="w-full bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Visa Number:</label>
              <input
                type="text"
                value={visaNumber}
                onChange={(e) => setVisaNumber(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Visa Expiry Date:</label>
              <div className="flex-grow flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-300">(DD-MM-YYYY)</span>
                <input
                  type="text"
                  value={visaExpiry}
                  onChange={(e) => setVisaExpiry(e.target.value)}
                  className="w-full bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">NI Number:</label>
              <input
                type="text"
                value={niNumber}
                onChange={(e) => setNiNumber(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Citizen of:</label>
              <input
                type="text"
                value={citizenOf}
                onChange={(e) => setCitizenOf(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Contact Phone:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-start md:col-span-2">
              <label className="w-36 font-normal text-slate-100 shrink-0 pt-1">Contact Address:</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none min-h-[60px] resize-y"
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-500 my-4" />

        {/* Emergency Contact Details Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold tracking-wide border-b border-slate-500 pb-1 text-slate-200 uppercase">
            Emergency Contact Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Contact Person:</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">Contact Phone:</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-center">
              <label className="w-36 font-normal text-slate-100 shrink-0">
                Contact Email Address:
              </label>
              <input
                type="email"
                value={emergencyEmail}
                onChange={(e) => setEmergencyEmail(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none h-7"
              />
            </div>

            <div className="flex items-start md:col-span-2">
              <label className="w-36 font-normal text-slate-100 shrink-0 pt-1">Contact Address:</label>
              <textarea
                value={emergencyAddress}
                onChange={(e) => setEmergencyAddress(e.target.value)}
                className="flex-grow bg-white text-black px-2 py-1 border border-black rounded-none text-xs focus:outline-none min-h-[60px] resize-y"
              />
            </div>
          </div>
        </div>

        {/* Save button block */}
        <div className="pt-4 border-t border-slate-500 flex justify-start">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2a2a2a] hover:bg-[#383838] text-white px-6 py-1.5 border border-black text-xs font-semibold cursor-pointer rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
