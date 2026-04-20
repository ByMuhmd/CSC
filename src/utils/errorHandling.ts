
export const handleSecureError = (err: any, fallbackMessage: string = "حصل خطأ غير متوقع، يرجى المحاولة مرة أخرى") => {
    console.error('[Security Trace]:', err);

    
    return fallbackMessage;
};

export const getGenericErrorMessage = (err: any) => {
    if (err?.code === 'PGRST116') return "البيانات غير موجودة";
    if (err?.message?.includes('network')) return "خطأ في الاتصال بالإنترنت";
    return "حصل خطأ في معالجة طلبك";
};
