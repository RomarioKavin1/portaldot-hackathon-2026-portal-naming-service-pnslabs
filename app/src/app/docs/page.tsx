import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SdkDocs } from "@/components/SdkDocs";
import { SketchDefs } from "@/components/doodles";

export const metadata = {
  title: "SDK · Portal Naming Service",
  description: "TypeScript & Python SDK docs for resolving .pot names on Portaldot.",
};

export default function DocsPage() {
  return (
    <>
      <SketchDefs />
      <SiteHeader />
      <main>
        <SdkDocs />
      </main>
      <SiteFooter />
    </>
  );
}
