import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon } from "lucide-react";

import { ImportForm } from "@/app/settings/import-form";
import { ProfileForm } from "@/app/settings/profile-form";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserProfile } from "@/db/queries";

export const metadata: Metadata = { title: "Settings — CertDojo" };

// Settings is the "candidate records office" (DESIGN.md Step 7 amendment)
// and is deliberately NOT inside the onboarding-gated (app) group: restoring
// a backup onto a fresh instance — the import feature's main use case — has
// to work before onboarding has ever run.
export const dynamic = "force-dynamic";

function SectionKicker({ children }: { children: string }) {
  return (
    <CardTitle className="text-muted-foreground font-mono text-xs font-semibold tracking-widest uppercase">
      {children}
    </CardTitle>
  );
}

export default async function SettingsPage() {
  const profile = await getUserProfile();
  const onboarded = profile?.onboardingDone ?? false;

  return (
    <div className="min-h-dvh">
      <header className="bg-card border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard">
            <BrandLockup />
          </Link>
          <Link
            href={onboarded ? "/dashboard" : "/onboarding"}
            className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-widest uppercase"
          >
            ← {onboarded ? "Dashboard" : "Onboarding"}
          </Link>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-xl gap-6 px-6 py-10">
        <section className="grid gap-1">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Settings
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Your data</h1>
        </section>
        {profile ? (
          <Card>
            <CardHeader>
              <SectionKicker>Candidate</SectionKicker>
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                On record since {profile.createdAt.toISOString().slice(0, 10)}
              </p>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialName={profile.name}
                initialJobTitle={profile.jobTitle}
              />
            </CardContent>
          </Card>
        ) : null}
        {onboarded ? (
          <Card>
            <CardHeader>
              <SectionKicker>Export</SectionKicker>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm leading-6">
                Download everything CertDojo stores about you — profile, tracked
                certifications, question attempts — as one JSON file. Keep it as
                a backup or carry it to another instance.
              </p>
              <div>
                <Button asChild>
                  {/* A plain download link: the route sets the filename and
                      it works without JavaScript. */}
                  <a href="/settings/export" download>
                    <DownloadIcon aria-hidden="true" />
                    Export my data
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <SectionKicker>Import</SectionKicker>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-muted-foreground text-sm leading-6">
              Restore a previously exported CertDojo file
              {onboarded
                ? ". The file is validated before anything is written; matching records are overwritten, nothing is duplicated."
                : " from another machine or instance. Importing completes setup — no need to fill in onboarding first."}
            </p>
            <ImportForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
