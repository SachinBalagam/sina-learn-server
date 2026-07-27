import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string, orgId: string) {
    return this.prisma.certificate.findMany({
      where: { userId, organizationId: orgId, deletedAt: null },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findById(id: string, orgId: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!cert) {
      throw new NotFoundException({ code: 'CERTIFICATE_NOT_FOUND', message: 'Certificate not found' });
    }
    return cert;
  }

  async findByOrg(orgId: string, options?: { page?: number; limit?: number }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { organizationId: orgId, deletedAt: null },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.certificate.count({ where: { organizationId: orgId, deletedAt: null } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async verify(id: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true, slug: true } },
      },
    });
    if (!cert) {
      throw new NotFoundException({ code: 'CERTIFICATE_INVALID', message: 'This certificate code is invalid or expired' });
    }
    return {
      isValid: true,
      id: cert.id,
      title: cert.title,
      description: cert.description,
      issuedAt: cert.issuedAt.toISOString(),
      user: {
        firstName: cert.user?.firstName ?? '',
        lastName: cert.user?.lastName ?? '',
      },
      organization: {
        name: cert.organization.name,
      },
    };
  }

  async issue(orgId: string, issuedById: string, courseId: string, recipientId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }

    const existing = await this.prisma.certificate.findFirst({
      where: { userId: recipientId, courseId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ code: 'CERTIFICATE_EXISTS', message: 'User already has a certificate for this course' });
    }

    return this.prisma.certificate.create({
      data: {
        title: `Certificate of Completion - ${course.title}`,
        description: `Successfully completed all modules of ${course.title}.`,
        organizationId: orgId,
        courseId,
        userId: recipientId,
      },
    });
  }

  async revoke(id: string, orgId: string) {
    await this.findById(id, orgId);
    return this.prisma.certificate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async generatePdf(id: string, orgId?: string): Promise<Buffer> {
    const cert = await this.prisma.certificate.findFirst({
      where: { id, ...(orgId ? { organizationId: orgId } : {}), deletedAt: null },
      include: {
        user: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true, settings: true } },
        course: { select: { title: true, certificateTemplateUrl: true } },
      },
    });
    if (!cert) {
      throw new NotFoundException({ code: 'CERTIFICATE_NOT_FOUND', message: 'Certificate not found' });
    }

    const backgroundUrl = cert.course?.certificateTemplateUrl || (cert.organization.settings as any)?.certificate?.backgroundUrl;
    let bgBuffer: Buffer | null = null;

    if (backgroundUrl) {
      try {
        let fullUrl = backgroundUrl;
        if (backgroundUrl.startsWith('/')) {
          const baseUrl = process.env.UPLOAD_BASE_URL || 'http://localhost:4000';
          fullUrl = `${baseUrl}${backgroundUrl}`;
        }
        const response = await fetch(fullUrl);
        if (response.ok) {
          bgBuffer = Buffer.from(await response.arrayBuffer());
        }
      } catch (err) {
        this.logger.error('Failed to download certificate background image', err);
      }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      if (bgBuffer) {
        try {
          doc.image(bgBuffer, 0, 0, { width: pageWidth, height: pageHeight });
        } catch (err) {
          this.logger.error('Failed to render background image in PDF', err);
        }
      } else {
        // Warm ivory background fill
        doc.rect(0, 0, pageWidth, pageHeight).fill('#faf6f0');

        // Draw elegant double gold frame
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(1).stroke('#f59e0b');
        doc.rect(25, 25, pageWidth - 50, pageHeight - 50).lineWidth(4).stroke('#d97706');
        doc.rect(33, 33, pageWidth - 66, pageHeight - 66).lineWidth(1.5).stroke('#b45309');

        // Draw elegant corner diamonds
        const drawDiamond = (x: number, y: number, size: number) => {
          doc.moveTo(x, y - size)
             .lineTo(x + size, y)
             .lineTo(x, y + size)
             .lineTo(x - size, y)
             .closePath()
             .fillAndStroke('#d97706', '#b45309');
        };

        drawDiamond(33, 33, 5);
        drawDiamond(pageWidth - 33, 33, 5);
        drawDiamond(33, pageHeight - 33, 5);
        drawDiamond(pageWidth - 33, pageHeight - 33, 5);
      }

      // Organization name
      doc.y = 70;
      const orgName = (cert.organization.name || '').toUpperCase();
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#b45309')
         .text(orgName, { align: 'center', characterSpacing: 2 });

      // Title
      doc.y = 95;
      doc.fontSize(32)
         .font('Times-Bold')
         .fillColor('#0f172a')
         .text('Certificate of Completion', { align: 'center' });

      // Title divider line
      doc.moveTo(pageWidth / 2 - 50, 142)
         .lineTo(pageWidth / 2 + 50, 142)
         .lineWidth(1.5)
         .stroke('#d97706');

      // Introduction
      doc.y = 165;
      doc.fontSize(12)
         .font('Times-Italic')
         .fillColor('#475569')
         .text('This document officially certifies that', { align: 'center' });

      // Recipient name
      doc.y = 195;
      const recipientName = `${cert.user?.firstName || ''} ${cert.user?.lastName || ''}`;
      doc.fontSize(30)
         .font('Times-Bold')
         .fillColor('#0f172a')
         .text(recipientName, { align: 'center' });

      // Name underline
      doc.moveTo(pageWidth / 2 - 180, 242)
         .lineTo(pageWidth / 2 + 180, 242)
         .lineWidth(0.5)
         .stroke('#cbd5e1');

      // Statement
      doc.y = 265;
      doc.fontSize(10)
         .font('Times-Roman')
         .fillColor('#475569')
         .text('has successfully completed all required curricular syllabus modules and assessments,', { align: 'center' })
         .text('satisfying all criteria for the completion of:', { align: 'center' });

      // Course title
      doc.y = 305;
      const courseTitle = (cert.course?.title || cert.title).replace('Certificate of Completion - ', '').toUpperCase();
      doc.fontSize(18)
         .font('Times-Bold')
         .fillColor('#b45309')
         .text(courseTitle, { align: 'center', paragraphGap: 5 });

      // Bottom section: Signatures & Seal (Y=400)
      const bottomY = 400;

      // Left: Signature line
      const leftSigText = cert.organization.name[0].toUpperCase() + cert.organization.name.slice(1).toLowerCase() + ' Authority';
      doc.fontSize(14)
         .font('Times-Italic')
         .fillColor('#d97706')
         .text(leftSigText, 60, bottomY, { width: 220, align: 'center' });
      doc.moveTo(80, bottomY + 28)
         .lineTo(260, bottomY + 28)
         .lineWidth(0.5)
         .stroke('#94a3b8');
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#64748b')
         .text('ISSUER AUTHORITY', 60, bottomY + 36, { width: 220, align: 'center' });

      // Right: Date line
      const issuedDate = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      doc.fontSize(12)
         .font('Times-Bold')
         .fillColor('#0f172a')
         .text(issuedDate, pageWidth - 280, bottomY + 4, { width: 220, align: 'center' });
      doc.moveTo(pageWidth - 260, bottomY + 28)
         .lineTo(pageWidth - 80, bottomY + 28)
         .lineWidth(0.5)
         .stroke('#94a3b8');
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#64748b')
         .text('DATE OF GRADUATION', pageWidth - 280, bottomY + 36, { width: 220, align: 'center' });

      // Center: Gold Seal (centered at pageWidth/2, bottomY+12)
      const sealCenterX = pageWidth / 2;
      const sealCenterY = bottomY + 12;
      
      // Draw outer dashed circle to match HTML dashed gear ring
      doc.circle(sealCenterX, sealCenterY, 28)
         .lineWidth(3)
         .dash(4, { space: 3 })
         .strokeColor('#f59e0b')
         .stroke();
      doc.undash();

      // Gold base circle
      doc.circle(sealCenterX, sealCenterY, 24)
         .fillColor('#d97706')
         .fill();
      doc.circle(sealCenterX, sealCenterY, 24)
         .lineWidth(1)
         .strokeColor('#b45309')
         .stroke();
      doc.circle(sealCenterX, sealCenterY, 20)
         .lineWidth(0.5)
         .strokeColor('#fef08a')
         .stroke();

      // Seal checkmark symbol
      doc.fontSize(14)
         .font('Times-Bold')
         .fillColor('#ffffff')
         .text('✔', sealCenterX - 10, sealCenterY - 7, { width: 20, align: 'center' });

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#b45309')
         .text('VERIFIED SECURITY', pageWidth / 2 - 100, bottomY + 50, { width: 200, align: 'center' });

      // Footer metadata
      const footerY = pageHeight - 50;
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#64748b')
         .text(`CREDENTIAL ID:  ${(cert.id || '').toUpperCase()}`, 50, footerY, { align: 'left' });

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#15803d')
         .text('SINA LEARN SECURE VERIFIED RECORD', pageWidth - 250, footerY, { width: 200, align: 'right' });

      doc.end();
    });
  }
}
