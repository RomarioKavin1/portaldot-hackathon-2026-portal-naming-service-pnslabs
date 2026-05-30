import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SdkDocs } from "@/components/SdkDocs";

export const metadata = {
  title: "SDK · Portal Naming Service",
  description: "TypeScript SDK docs for resolving .pot names on Portaldot.",
};

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-28 pt-14 sm:pt-20">
        <SdkDocs />
      </main>
      <SiteFooter />
    </div>
  );
}
