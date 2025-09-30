import Image from "next/image";

const SecuritySection = () => {
  return (
    <section className="relative overflow-hidden bg-background px-6 py-[120px] text-foreground">
      <div className="absolute inset-0 opacity-10">
        <Image
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/images/next-081880-1yWQZ86ALnNG2WXCpxXtD7AP2uM.png?"
          alt="Geometric background pattern"
          fill
          className="object-cover"
          quality={100} />

      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-12 sm:gap-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Enterprise-grade Security. From Cloud to Local.
          </h2>
          <p className="mt-4 text-lg leading-[1.6] text-text-secondary !whitespace-pre-line !whitespace-pre-line">Your data is protected by industry-leading SOC 2 Type 2, HIPAA, PCI and GDPR compliance standards, whether in our cloud or on-premises.

          </p>
        </div>

        <div className="flex items-center gap-8 md:gap-12">
          <div className="relative h-24 w-24">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/7faa4423-29cc-4b27-a117-d33c42640a6e/generated_images/professional-hipaa-compliance-badge-for--7e70f819-20250906140304.jpg?"
              alt="HIPAA Compliant badge"
              fill
              className="object-contain" />
          </div>
          <div className="relative h-36 w-36">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/7faa4423-29cc-4b27-a117-d33c42640a6e/generated_images/professional-pci-dss-compliance-badge-fo-423f42f6-20250906140503.jpg?"
              alt="PCI DSS Compliant badge"
              fill
              className="object-contain" />
          </div>
          <div className="relative h-24 w-24">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/7faa4423-29cc-4b27-a117-d33c42640a6e/generated_images/professional-gdpr-compliance-badge-for-e-a9f59112-20250906140313.jpg?"
              alt="GDPR Compliant badge"
              fill
              className="object-contain" />
          </div>
        </div>
      </div>
    </section>);

};

export default SecuritySection;