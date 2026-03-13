import { CertificateTemplate } from "../services/certificate-generator.service";
import { CertificateTemplateType } from "../types/certificate-template.enum";
import { drawAchievementCertificate } from "./achievement-certificate";
import { drawAppointmentLetter }       from "./appointment-letter";
import { drawCompletionCertificate }   from "./completion-certificate";
import { drawInternshipCertificate }        from "./internship-letter";
import { drawWorkshopCertificate }     from "./workshop-certificate";


// uses the wider Record<string, unknown>. We use a helper to safely bridge the gap —
// this is sound because CertificateGeneratorService passes `data: any` at runtime,
// so the concrete types are always satisfied. Using `as unknown as CertificateTemplate`
// directly in the registry would lose the settings property, so we preserve it here.
function asTemplate(
    fn: (doc: any, data: any) => void,
    settings?: any
): CertificateTemplate {
    const template = fn as CertificateTemplate;
    if (settings) template.settings = settings;
    return template;
}

export const TEMPLATE_REGISTRY: Record<CertificateTemplateType, CertificateTemplate> = {
    [CertificateTemplateType.ACHIEVEMENT]: asTemplate(drawAchievementCertificate, drawAchievementCertificate.settings),
    [CertificateTemplateType.APPOINTMENT]: asTemplate(drawAppointmentLetter,      drawAppointmentLetter.settings),
    [CertificateTemplateType.COMPLETION]:  asTemplate(drawCompletionCertificate,  drawCompletionCertificate.settings),
    [CertificateTemplateType.INTERNSHIP]:  asTemplate(drawInternshipCertificate,  drawInternshipCertificate.settings),
    [CertificateTemplateType.WORKSHOP]:    asTemplate(drawWorkshopCertificate,    drawWorkshopCertificate.settings),
};

export function resolveTemplate(type: CertificateTemplateType): CertificateTemplate {
    const template = TEMPLATE_REGISTRY[type];
    if (!template) throw new Error(`Unknown certificate template: ${type}`);
    return template;
}