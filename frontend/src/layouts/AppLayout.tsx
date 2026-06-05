import {
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileText,
  Home,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  UserPlus,
  UsersRound
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const authenticatedNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home }
];

const guestNavItems = [
  { to: "/login", label: "Login", icon: LogIn },
  { to: "/register", label: "Register", icon: UserPlus }
];

const getTopLevelMenuClassName = (isActive = false) =>
  cn(
    "!font-normal !text-muted-foreground hover:bg-muted-100 hover:text-pup-maroon",
    isActive &&
      "bg-pup-maroon !text-white hover:bg-pup-maroon hover:!text-white"
  );

export default function AppLayout() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const applicationsMenuRef = useRef<HTMLDivElement>(null);
  const formsMenuRef = useRef<HTMLDivElement>(null);
  const usersMenuRef = useRef<HTMLDivElement>(null);
  const programsMenuRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<
    "applications" | "forms" | "programs" | "users" | null
  >(null);
  const navItems = isAuthenticated ? authenticatedNavItems : guestNavItems;
  const gsroRoleCodes = [
    "GSREC_GSREO_OFFICER",
    "GSRO_OFFICER",
    "GSRO"
  ];
  const hasGsroAccess = gsroRoleCodes.some((roleCode) =>
    user?.role_codes?.includes(roleCode)
  );
  const hasReviewerAccess = Boolean(
    user?.role_codes?.includes("PROGRAM_REVIEWER")
  );
  const isApplicationsMenuOpen = openMenu === "applications";
  const isFormsMenuOpen = openMenu === "forms";
  const isUsersMenuOpen = openMenu === "users";
  const isProgramsMenuOpen = openMenu === "programs";
  const isStartApplicationRoute = location.pathname.startsWith("/forms/apply");
  const isFormsRoute =
    location.pathname.startsWith("/forms") && !isStartApplicationRoute;
  const isApplicationsRoute =
    location.pathname.startsWith("/applications") || isStartApplicationRoute;
  const isUsersRoute = location.pathname.startsWith("/users");
  const isProgramsRoute = location.pathname.startsWith("/programs");

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        applicationsMenuRef.current?.contains(target) ||
        formsMenuRef.current?.contains(target) ||
        usersMenuRef.current?.contains(target) ||
        programsMenuRef.current?.contains(target)
      ) {
        return;
      }

      setOpenMenu(null);
    };

    document.addEventListener("mousedown", closeMenus);

    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setOpenMenu(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-pup-maroon text-pup-gold">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide text-pup-maroon">
                PUP
              </span>
              <span className="block text-base font-bold text-ink-900">
                Ethics Clearance System
              </span>
            </span>
          </NavLink>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Button
                key={item.to}
                type="button"
                variant="ghost"
                className={getTopLevelMenuClassName(location.pathname === item.to)}
                onClick={() => navigate(item.to)}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Button>
            ))}
            {isAuthenticated ? (
              <div ref={applicationsMenuRef} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className={getTopLevelMenuClassName(isApplicationsRoute)}
                  aria-expanded={isApplicationsMenuOpen}
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === "applications" ? null : "applications"
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Applications
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isApplicationsMenuOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </Button>

                {isApplicationsMenuOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border bg-white shadow-lg">
                    <NavLink
                      to="/forms/apply"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 border-b px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                      Start Application
                    </NavLink>
                    <NavLink
                      to="/applications/my"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 border-b px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      My Applications
                    </NavLink>
                    {hasReviewerAccess ? (
                      <NavLink
                        to="/applications/for-signature"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                            isActive && "bg-pup-maroon/10 text-pup-maroon"
                          )
                        }
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        For Signature
                      </NavLink>
                    ) : null}
                    {hasGsroAccess ? (
                      <NavLink
                        to="/applications"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 border-t px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                            isActive && "bg-pup-maroon/10 text-pup-maroon"
                          )
                        }
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        GSRO Queue
                      </NavLink>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated ? (
              <div ref={programsMenuRef} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className={getTopLevelMenuClassName(isProgramsRoute)}
                  aria-expanded={isProgramsMenuOpen}
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === "programs" ? null : "programs"
                    )
                  }
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Programs
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isProgramsMenuOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </Button>

                {isProgramsMenuOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border bg-white shadow-lg">
                    <NavLink
                      to="/programs/create"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 border-b px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create Program
                    </NavLink>
                    <NavLink
                      to="/programs/view"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      View Program
                    </NavLink>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated ? (
              <div ref={formsMenuRef} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className={getTopLevelMenuClassName(isFormsRoute)}
                  aria-expanded={isFormsMenuOpen}
                  onClick={() =>
                    setOpenMenu((current) => (current === "forms" ? null : "forms"))
                  }
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Forms
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isFormsMenuOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </Button>

                {isFormsMenuOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-md border bg-white shadow-lg">
                    <NavLink
                      to="/forms/create"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 border-b px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create Forms
                    </NavLink>
                    <NavLink
                      to="/forms/view"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      View Forms
                    </NavLink>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated ? (
              <div ref={usersMenuRef} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className={getTopLevelMenuClassName(isUsersRoute)}
                  aria-expanded={isUsersMenuOpen}
                  onClick={() =>
                    setOpenMenu((current) => (current === "users" ? null : "users"))
                  }
                >
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                  Users
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isUsersMenuOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </Button>

                {isUsersMenuOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border bg-white shadow-lg">
                    <NavLink
                      to="/users/add"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 border-b px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Add User
                    </NavLink>
                    <NavLink
                      to="/users/view"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-3 py-2 text-sm text-ink-900 hover:bg-muted-100",
                          isActive && "bg-pup-maroon/10 text-pup-maroon"
                        )
                      }
                    >
                      <UsersRound className="h-4 w-4" aria-hidden="true" />
                      View User
                    </NavLink>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated ? (
              <Button
                type="button"
                variant="outline"
                className="text-pup-maroon"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </Button>
            ) : null}
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
