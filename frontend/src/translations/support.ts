// Support page translations for Thai and English

export const supportTranslations = {
  en: {
    // Header
    backToReview: "Back to Review",
    supportReviewer: "Support Reviewer",
    supportDescription: "Send WLD tokens to show appreciation for this review",
    
    // Loading & Errors
    loadingReview: "Loading review...",
    unableToLoad: "Unable to load review",
    failedToLoadReview: "Failed to load review data",
    failedToLoadBalance: "Failed to load your balance",
    reviewIdMissing: "Review ID is missing",
    
    // Success
    success: "Success!",
    successMessage: "Successfully sent {{amount}} WLD to @{{username}}!",
    shareSupport: "Share your support",
    copiedToClipboard: "Copied to clipboard!",
    viewTransaction: "View transaction",
    
    // Balance
    yourBalance: "Your Balance",
    balanceTooLow: "Your balance is too low to support this review (minimum 0.01 WLD)",
    
    // Amount Selection
    supportAmount: "Support Amount",
    platformFee: "5% platform fee",
    customAmount: "Custom Amount",
    
    // Validation Errors
    minimumAmount: "Minimum amount is 0.01 WLD",
    exceedsBalance: "Amount exceeds your balance",
    invalidAmount: "Please enter a valid amount",
    
    // Transaction Preview
    transactionPreview: "Transaction Preview",
    youSend: "You send",
    platformFeeLabel: "Platform fee (5%)",
    reviewerReceives: "Reviewer receives",
    yourNewBalance: "Your new balance",
    
    // Submit Button
    sendSupport: "Send Support",
    processingTransaction: "Processing transaction...",
    
    // Transaction Error
    transactionError: "Transaction Error",
    transactionFailed: "Transaction failed. Please try again.",
    
    // Processing Status
    confirmingTransaction: "Confirming Transaction",
    confirmingDescription: "Your transaction is being confirmed on the blockchain. This usually takes a few seconds.",
    viewOnExplorer: "View on Explorer",
    
    // Movie Review Card
    anonymous: "Anonymous",
    
    // Accessibility
    wldToken: "WLD Token",
    
    // Wallet Required
    walletRequired: "Wallet Required",
    walletRequiredDescription: "Please connect your wallet to support reviews.",
    supportReviewTitle: "Support Review",
  },
  th: {
    // Header
    backToReview: "กลับไปรีวิว",
    supportReviewer: "สนับสนุนผู้รีวิว",
    supportDescription: "ส่ง WLD โทเค็นเพื่อแสดงความชื่นชมสำหรับรีวิวนี้",
    
    // Loading & Errors
    loadingReview: "กำลังโหลดรีวิว...",
    unableToLoad: "ไม่สามารถโหลดรีวิว",
    failedToLoadReview: "โหลดข้อมูลรีวิวไม่สำเร็จ",
    failedToLoadBalance: "โหลดยอดคงเหลือไม่สำเร็จ",
    reviewIdMissing: "ไม่พบ ID ของรีวิว",
    
    // Success
    success: "สำเร็จ!",
    successMessage: "ส่ง {{amount}} WLD ให้ @{{username}} สำเร็จแล้ว!",
    shareSupport: "แชร์การสนับสนุนของคุณ",
    copiedToClipboard: "คัดลอกไปยังคลิปบอร์ดแล้ว!",
    viewTransaction: "ดูธุรกรรม",
    
    // Balance
    yourBalance: "ยอดคงเหลือของคุณ",
    balanceTooLow: "ยอดคงเหลือของคุณต่ำเกินไปในการสนับสนุนรีวิวนี้ (ขั้นต่ำ 0.01 WLD)",
    
    // Amount Selection
    supportAmount: "จำนวนที่สนับสนุน",
    platformFee: "ค่าธรรมเนียมแพลตฟอร์ม 5%",
    customAmount: "กำหนดจำนวนเอง",
    
    // Validation Errors
    minimumAmount: "จำนวนขั้นต่ำคือ 0.01 WLD",
    exceedsBalance: "จำนวนเกินยอดคงเหลือของคุณ",
    invalidAmount: "กรุณากรอกจำนวนที่ถูกต้อง",
    
    // Transaction Preview
    transactionPreview: "ตัวอย่างธุรกรรม",
    youSend: "คุณส่ง",
    platformFeeLabel: "ค่าธรรมเนียมแพลตฟอร์ม (5%)",
    reviewerReceives: "ผู้รีวิวได้รับ",
    yourNewBalance: "ยอดคงเหลือใหม่ของคุณ",
    
    // Submit Button
    sendSupport: "ส่งการสนับสนุน",
    processingTransaction: "กำลังดำเนินการธุรกรรม...",
    
    // Transaction Error
    transactionError: "ข้อผิดพลาดในธุรกรรม",
    transactionFailed: "ธุรกรรมล้มเหลว กรุณาลองอีกครั้ง",
    
    // Processing Status
    confirmingTransaction: "กำลังยืนยันธุรกรรม",
    confirmingDescription: "ธุรกรรมของคุณกำลังได้รับการยืนยันบนบล็อกเชน โดยปกติจะใช้เวลาเพียงไม่กี่วินาที",
    viewOnExplorer: "ดูใน Explorer",
    
    // Movie Review Card
    anonymous: "ไม่ระบุชื่อ",
    
    // Accessibility
    wldToken: "โทเค็น WLD",
    
    // Wallet Required
    walletRequired: "ต้องการกระเป๋าเงิน",
    walletRequiredDescription: "กรุณาเชื่อมต่อกระเป๋าเงินของคุณเพื่อสนับสนุนรีวิว",
    supportReviewTitle: "สนับสนุนรีวิว",
  },
};

// Type-safe translation function
export type SupportTranslationKey = keyof typeof supportTranslations.en;

export const getSupportTranslation = (
  locale: string,
  key: SupportTranslationKey,
  params?: Record<string, string | number>
): string => {
  const translations = locale === 'th' ? supportTranslations.th : supportTranslations.en;
  let text = translations[key] || supportTranslations.en[key];
  
  // Replace placeholders like {{amount}} with actual values
  if (params) {
    Object.keys(params).forEach((param) => {
      text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
    });
  }
  
  return text;
};
