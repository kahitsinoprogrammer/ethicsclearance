import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Search,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import FormField from "@/components/common/FormField";
import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchUsers,
  updateUser,
  type Role,
  type UserRecord,
  type UsersPagination
} from "@/lib/api";
import { cn } from "@/lib/utils";

const classificationOptions: ComboboxItem[] = [
  { label: "GS Student", value: "GS Student" },
  { label: "Faculty", value: "Faculty" },
  { label: "Researcher", value: "Researcher" },
  { label: "Staff", value: "Staff" }
];

const honorificOptions: ComboboxItem[] = [
  { label: "Mr.", value: "Mr." },
  { label: "Ms.", value: "Ms." },
  { label: "Dr.", value: "Dr." },
  { label: "Prof.", value: "Prof." },
  { label: "Mx.", value: "Mx." }
];

const statusOptions: ComboboxItem[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

type EditUserFormValues = {
  cellphoneNumber: string;
  classification: string;
  email: string;
  firstName: string;
  honorifics: string;
  lastName: string;
  middleName: string;
  program: string;
  roleIds: string[];
  status: string;
  studentNo: string;
  username: string;
};

const buildFullName = (user: UserRecord) => {
  return [user.honorifics, user.firstname, user.middlename, user.lastname]
    .filter(Boolean)
    .join(" ");
};

const buildEditUserFormValues = (
  user: UserRecord
): EditUserFormValues => {
  return {
    cellphoneNumber: user.contact_no ?? "",
    classification: user.user_type ?? "",
    email: user.email ?? "",
    firstName: user.firstname ?? "",
    honorifics: user.honorifics ?? "",
    lastName: user.lastname ?? "",
    middleName: user.middlename ?? "",
    program: user.program ?? "",
    roleIds: user.role_ids ?? [],
    status: user.is_active ? "active" : "inactive",
    studentNo: user.student_no ?? "",
    username: user.username ?? ""
  };
};

export default function UsersViewPage() {
  const { logout, token, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [programOptions, setProgramOptions] = useState<ComboboxItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [appliedClassification, setAppliedClassification] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [pagination, setPagination] = useState<UsersPagination>({
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 1
  });
  const [pageError, setPageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<EditUserFormValues>({
    defaultValues: {
      cellphoneNumber: "",
      classification: "",
      email: "",
      firstName: "",
      honorifics: "",
      lastName: "",
      middleName: "",
      program: "",
      roleIds: [],
      status: "",
      studentNo: "",
      username: ""
    },
    mode: "onBlur"
  });
  const selectedRoleIds = watch("roleIds");

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      if (!token) {
        if (isMounted) {
          setIsLoading(false);
          setUsers([]);
          setRoles([]);
          setProgramOptions([]);
        }
        return;
      }

      try {
        setIsLoading(true);
        const usersResult = await fetchUsers(token, {
          classification: appliedClassification,
          page: pagination.page,
          search: appliedSearch,
          status: appliedStatus
        });

        if (!isMounted) {
          return;
        }

        setUsers(usersResult.users);
        setPagination(usersResult.pagination);
        setRoles(usersResult.roles);
        setProgramOptions(
          usersResult.programs.map((programItem) => ({
            label: `${programItem.program_name} (${programItem.program_code})`,
            value: programItem.program_name,
            searchText: `${programItem.program_name} ${programItem.program_code}`
          }))
        );
        setPageError("");
      } catch (error) {
        if (isMounted) {
          setPageError(
            error instanceof Error ? error.message : "Failed to load users"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [
    appliedClassification,
    appliedSearch,
    appliedStatus,
    pagination.page,
    token
  ]);

  const openEditModal = (user: UserRecord) => {
    setSubmitError("");
    setSelectedUser(user);
    reset(buildEditUserFormValues(user));
  };

  const closeEditModal = () => {
    setSelectedUser(null);
    setSubmitError("");
  };

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setAppliedClassification(classificationFilter);
    setAppliedStatus(statusFilter);
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: 1
    }));
  };

  const clearFilters = () => {
    setSearch("");
    setClassificationFilter("");
    setStatusFilter("");
    setAppliedSearch("");
    setAppliedClassification("");
    setAppliedStatus("");
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: 1
    }));
  };

  const goToPreviousPage = () => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: Math.max(currentPagination.page - 1, 1)
    }));
  };

  const goToNextPage = () => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      page: Math.min(
        currentPagination.page + 1,
        currentPagination.totalPages
      )
    }));
  };

  const onSubmit = async (values: EditUserFormValues) => {
    if (!token || !selectedUser) {
      return;
    }

    try {
      setSubmitError("");
      const updatedUser = await updateUser(token, selectedUser.user_id, values);

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.user_id === updatedUser.user_id ? updatedUser : user
        )
      );

      if (updatedUser.user_id === user?.user_id && !updatedUser.is_active) {
        closeEditModal();
        logout();
        toast.success(
          "Your account was updated and is now inactive. Please contact an administrator if you need access restored.",
          "Account signed out"
        );
        navigate("/login", { replace: true });
        return;
      }

      closeEditModal();
      toast.success("User details updated successfully.", "User updated");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to update user."
      );
    }
  };

  const toggleRoleSelection = (roleId: string, isChecked: boolean) => {
    const nextRoleIds = isChecked
      ? Array.from(new Set([...selectedRoleIds, roleId]))
      : selectedRoleIds.filter((currentRoleId) => currentRoleId !== roleId);

    setValue("roleIds", nextRoleIds, {
      shouldDirty: true,
      shouldTouch: true
    });
  };

  return (
    <>
      <LoadingModal
        open={isLoading || isSubmitting}
        title={isSubmitting ? "Updating user" : "Loading users"}
        description={
          isSubmitting
            ? "We are saving the revised user details."
            : "We are fetching user records and reference data."
        }
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Users"
          title="View users"
          description="Search, review, and modify user records."
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>User records</CardTitle>
            <CardDescription>
              Select a user row to revise their profile details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto_auto]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Search name, email, username, student no., or program"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Combobox
                items={classificationOptions}
                placeholder="All classifications"
                searchPlaceholder="Search classification"
                value={classificationFilter}
                onValueChange={setClassificationFilter}
              />
              <Combobox
                items={statusOptions}
                placeholder="All statuses"
                searchPlaceholder="Search status"
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
              <Button type="button" onClick={applyFilters}>
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>

            {pageError ? (
              <p className="mt-4 text-sm font-medium text-destructive">
                {pageError}
              </p>
            ) : null}

            <div className="mt-6 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px] border-collapse bg-white text-sm">
                <thead className="bg-muted-100 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Username</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Student no.</th>
                    <th className="px-4 py-3 font-semibold">Classification</th>
                    <th className="px-4 py-3 font-semibold">Program</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id} className="border-t">
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {buildFullName(user)}
                      </td>
                      <td className="px-4 py-3">{user.username}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.student_no}</td>
                      <td className="px-4 py-3">{user.user_type}</td>
                      <td className="px-4 py-3">{user.program}</td>
                      <td className="px-4 py-3">
                        {user.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(user)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!users.length && !isLoading ? (
                <div className="bg-white p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                    <UsersRound className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink-900">
                    No users found.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search term or filter.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={goToPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={goToNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContainer>

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-lg border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-pup-maroon">
                  Edit user
                </p>
                <h2 className="mt-1 text-xl font-semibold text-ink-900">
                  {buildFullName(selectedUser)}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeEditModal}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close edit modal</span>
              </Button>
            </div>

            <form
              className="grid gap-4 p-5 md:grid-cols-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="space-y-2">
                <Label>Honorifics</Label>
                <Controller
                  control={control}
                  name="honorifics"
                  rules={{ required: "Honorifics is required" }}
                  render={({ field }) => (
                    <Combobox
                      items={honorificOptions}
                      placeholder="Select honorific"
                      searchPlaceholder="Search honorific"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.honorifics ? (
                  <p className="text-xs font-medium text-destructive">
                    {errors.honorifics.message}
                  </p>
                ) : null}
              </div>
              <FormField
                id="edit-first-name"
                label="First name"
                error={errors.firstName?.message}
                {...register("firstName", {
                  required: "First name is required"
                })}
              />
              <FormField
                id="edit-middle-name"
                label="Middle name"
                helper="Optional"
                {...register("middleName")}
              />
              <FormField
                id="edit-last-name"
                label="Last name"
                error={errors.lastName?.message}
                {...register("lastName", {
                  required: "Last name is required"
                })}
              />
              <FormField
                id="edit-email"
                label="Email"
                type="email"
                error={errors.email?.message}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address"
                  }
                })}
              />
              <FormField
                id="edit-username"
                label="Username"
                error={errors.username?.message}
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 4,
                    message: "Username must be at least 4 characters"
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message:
                      "Use only letters, numbers, dots, underscores, or hyphens"
                  }
                })}
              />
              <FormField
                id="edit-cellphone"
                label="Cellphone number"
                error={errors.cellphoneNumber?.message}
                {...register("cellphoneNumber", {
                  required: "Cellphone number is required",
                  pattern: {
                    value: /^\+?[0-9\s-]{7,20}$/,
                    message: "Enter a valid cellphone number"
                  }
                })}
              />
              <FormField
                id="edit-student-no"
                label="Student no. / Employee no."
                error={errors.studentNo?.message}
                {...register("studentNo", {
                  required: "Student no. / Employee no. is required"
                })}
              />
              <div className="space-y-2">
                <Label>Classification</Label>
                <Controller
                  control={control}
                  name="classification"
                  rules={{ required: "Classification is required" }}
                  render={({ field }) => (
                    <Combobox
                      items={classificationOptions}
                      placeholder="Select classification"
                      searchPlaceholder="Search classification"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.classification ? (
                  <p className="text-xs font-medium text-destructive">
                    {errors.classification.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Program</Label>
                <Controller
                  control={control}
                  name="program"
                  rules={{ required: "Program is required" }}
                  render={({ field }) => (
                    <Combobox
                      items={programOptions}
                      placeholder="Select program"
                      searchPlaceholder="Search program name or code"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.program ? (
                  <p className="text-xs font-medium text-destructive">
                    {errors.program.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  rules={{ required: "Status is required" }}
                  render={({ field }) => (
                    <Combobox
                      items={statusOptions}
                      placeholder="Select status"
                      searchPlaceholder="Search status"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.status ? (
                  <p className="text-xs font-medium text-destructive">
                    {errors.status.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-3 md:col-span-2">
                <div>
                  <Label>Roles</Label>
                  <p className="text-xs text-muted-foreground">
                    Check every role that should be assigned to this user.
                  </p>
                </div>

                {roles.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {roles.map((role) => {
                      const isChecked = selectedRoleIds.includes(role.role_id);

                      return (
                        <label
                          key={role.role_id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                            isChecked
                              ? "border-pup-maroon bg-pup-maroon/5"
                              : "hover:bg-muted-100"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-pup-maroon focus:ring-pup-maroon"
                            checked={isChecked}
                            onChange={(event) =>
                              toggleRoleSelection(
                                role.role_id,
                                event.target.checked
                              )
                            }
                          />
                          <span>
                            <span className="block text-sm font-medium text-ink-900">
                              {role.role_name}
                            </span>
                            <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                              {role.role_code}
                            </span>
                            {role.description ? (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {role.description}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
                    No active roles are available yet.
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                {submitError ? (
                  <p className="mb-3 text-sm font-medium text-destructive">
                    {submitError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
