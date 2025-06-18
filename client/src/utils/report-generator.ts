import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface WeeklyReportData {
  employeeName: string;
  department: string;
  week: string;
  completedTasks: Array<{
    title: string;
    category: string;
    status: string;
    progress: number;
    completedAt?: Date;
  }>;
  inProgressTasks: Array<{
    title: string;
    category: string;
    progress: number;
    dueDate: Date;
  }>;
  achievements: string[];
  challenges: string[];
  nextWeekPlans: string[];
}

export async function generateWeeklyReportPDF(data: WeeklyReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // NARA Corporation 헤더
  pdf.setFontSize(20);
  pdf.setTextColor(91, 33, 182); // 보라색
  pdf.text('NARA CORPORATION', 105, 20, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('주간 업무 보고서', 105, 35, { align: 'center' });
  
  // 기본 정보
  pdf.setFontSize(12);
  let yPos = 55;
  
  pdf.text(`작성자: ${data.employeeName}`, 20, yPos);
  pdf.text(`부서: ${data.department}`, 120, yPos);
  yPos += 10;
  pdf.text(`보고 주차: ${data.week}`, 20, yPos);
  yPos += 20;
  
  // 완료된 업무
  pdf.setFontSize(14);
  pdf.setTextColor(91, 33, 182);
  pdf.text('완료된 업무', 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  data.completedTasks.forEach((task, index) => {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.text(`${index + 1}. ${task.title}`, 25, yPos);
    yPos += 6;
    pdf.text(`   업무구분: ${task.category} | 진행률: ${task.progress}%`, 25, yPos);
    yPos += 10;
  });
  
  yPos += 10;
  
  // 진행 중인 업무
  pdf.setFontSize(14);
  pdf.setTextColor(91, 33, 182);
  pdf.text('진행 중인 업무', 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  data.inProgressTasks.forEach((task, index) => {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.text(`${index + 1}. ${task.title}`, 25, yPos);
    yPos += 6;
    pdf.text(`   진행률: ${task.progress}% | 마감일: ${task.dueDate.toLocaleDateString('ko-KR')}`, 25, yPos);
    yPos += 10;
  });
  
  // 성과 및 특이사항
  if (data.achievements.length > 0) {
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setTextColor(91, 33, 182);
    pdf.text('주요 성과', 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    data.achievements.forEach((achievement, index) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(`• ${achievement}`, 25, yPos);
      yPos += 8;
    });
  }
  
  // 어려움 및 문제점
  if (data.challenges.length > 0) {
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setTextColor(91, 33, 182);
    pdf.text('어려움 및 문제점', 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    data.challenges.forEach((challenge, index) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(`• ${challenge}`, 25, yPos);
      yPos += 8;
    });
  }
  
  // 다음 주 계획
  if (data.nextWeekPlans.length > 0) {
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setTextColor(91, 33, 182);
    pdf.text('다음 주 계획', 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    data.nextWeekPlans.forEach((plan, index) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(`• ${plan}`, 25, yPos);
      yPos += 8;
    });
  }
  
  // 푸터
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`NARA Corporation 주간보고서 - ${i}/${pageCount}`, 105, 290, { align: 'center' });
  }
  
  // PDF 다운로드
  const fileName = `주간보고서_${data.employeeName}_${data.week.replace(/\s/g, '')}.pdf`;
  pdf.save(fileName);
}