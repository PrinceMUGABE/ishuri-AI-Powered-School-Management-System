// ParentDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    Users, UserPlus, Edit, Trash2, Search, Eye, X,
    ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
    AlertCircle, GraduationCap, BookOpen, Calendar,
    Sun, Moon, Plus, Info, Mail, Phone, MapPin,
    Download, Printer, FileText, BarChart3, Hash,
    User, UserCheck, Shield, Baby, Link2,
    BookOpenCheck, Filter, TrendingUp, Clock,
    Award, Activity, Star, Heart, MoveRight, Home,
    DoorOpen, Building2, Repeat, AlertTriangle, School,
    Users as UsersIcon, UserCircle, Check, Loader2,
    Wallet, CreditCard, MessageCircle, ChevronDown,
    DollarSign, Receipt, AlertOctagon, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import schoolLogo from "../../../public/imgs/school-logo.png";

// ============================================================
// API Configuration
// ============================================================
const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    const language = localStorage.getItem('user_language') || 'en';
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['X-Language'] = language;
    return config;
}, (error) => Promise.reject(error));

// ============================================================
// Paypack Payment Configuration
// ============================================================
const PAYPACK_CLIENT_ID = "e428eef2-28f0-11f1-a747-deadd43720af";
const PAYPACK_CLIENT_SECRET = "8e55dbfe8df9116cc5fd26e474fca8deda39a3ee5e6b4b0d3255bfef95601890afd80709";

const paypackAPI = {
    authenticate: async () => {
        try {
            const response = await axios.post(
                'https://payments.paypack.rw/api/auth/agents/authorize',
                {
                    client_id: PAYPACK_CLIENT_ID,
                    client_secret: PAYPACK_CLIENT_SECRET
                },
                {
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
                }
            );
            console.log('Paypack auth response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Paypack auth error:', error);
            throw error;
        }
    },
    cashin: async (phoneNumber, amount, accessToken) => {
        try {
            const response = await axios.post(
                'https://payments.paypack.rw/api/transactions/cashin',
                { number: phoneNumber, amount, environment: "development" },
                { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
            );
            return response.data;
        } catch (error) {
            console.error('Cashin error:', error);
            throw error;
        }
    },
    checkTransaction: async (ref, accessToken) => {
        try {
            const response = await axios.get(
                `https://payments.paypack.rw/api/transactions/find/${ref}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );
            console.log('Transaction check response:', response.data);

            // The API returns data directly - if we get a response with ref, it means transaction exists
            if (response.data && response.data.ref) {
                // Check if the transaction has all required fields (indicating it's complete)
                if (response.data.amount && response.data.client && response.data.kind) {
                    return {
                        status: 'success',
                        data: response.data,
                        ref: ref
                    };
                }
            }

            return {
                status: 'pending',
                message: 'Transaction still processing',
                ref: ref,
                data: response.data
            };
        } catch (error) {
            console.error('Transaction check error:', error);
            // If 404, transaction not found - still pending
            if (error.response && error.response.status === 404) {
                return {
                    status: 'pending',
                    message: 'Transaction still processing',
                    ref: ref
                };
            }
            return {
                status: 'error',
                message: error.message,
                ref: ref
            };
        }
    }
};

// ============================================================
// Helper Functions
// ============================================================
const Spinner = () => (
    <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />
);

const getStatusColors = (status, isDark) => {
    const colors = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        waiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        partially_paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || colors.inactive;
};

// ============================================================
// Performance Chart Component
// ============================================================
const PerformanceChart = ({ percentage, label, color = 'green' }) => {
    const getColorClasses = () => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{percentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColorClasses()} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// ============================================================
// Subject Performance Card
// ============================================================
const SubjectPerformanceCard = ({ subject, onClick, t }) => {
    const getBorderColor = () => {
        if (subject.final_percentage >= 80) return 'border-green-500';
        if (subject.final_percentage >= 50) return 'border-yellow-500';
        return 'border-red-500';
    };

    const getBgColor = () => {
        if (subject.final_percentage >= 80) return 'bg-green-50 dark:bg-green-900/20';
        if (subject.final_percentage >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20';
        return 'bg-red-50 dark:bg-red-900/20';
    };

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl border-l-4 ${getBorderColor()} ${getBgColor()} cursor-pointer hover:shadow-md transition-all`}
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{subject.subject_name}</p>
                    <p className="text-xs text-gray-500">{subject.grade_letter || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold text-gray-800 dark:text-white">{subject.final_percentage?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-gray-500">{subject.passed ? t('parent_dashboard.passed') : t('parent_dashboard.failed')}</p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Payment Status Card

const PaymentStatusCard = ({ payment, onPay, t }) => {
    // Safely convert to numbers
    const totalAmount = parseFloat(payment.total_amount) || 0;
    const paidAmount = parseFloat(payment.paid_amount) || 0;
    const remainingAmount = parseFloat(payment.remaining_amount) || 0;
    const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const statusColor = getStatusColors(payment.status, false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{payment.fee_name}</p>
                    <p className="text-xs text-gray-500">{t('parent_dashboard.due')}: {payment.due_date || 'N/A'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                    {payment.status_display || payment.status}
                </span>
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span>{t('parent_dashboard.paid')}: {paidAmount.toFixed(2)} FRW</span>
                    <span>{t('parent_dashboard.total')}: {totalAmount.toFixed(2)} FRW</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">
                    {t('parent_dashboard.remaining')}: {remainingAmount.toFixed(2)} FRW
                </p>
                {remainingAmount > 0 && (
                    <button
                        onClick={() => onPay(payment)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg flex items-center gap-1 transition-colors"
                    >
                        <Wallet className="w-3 h-3" /> {t('parent_dashboard.payNow')}
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================
// Payment Modal
// ============================================================

// Updated PaymentModal - remove dollar sign, use FRW
const PaymentModal = ({ payment, onClose, onSuccess, parentPhone, t }) => {
    // ALL hooks must be called before any conditional returns
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState(parentPhone || '');
    const [amount, setAmount] = useState(0);
    const [step, setStep] = useState('form');
    const [error, setError] = useState('');
    const [transactionRef, setTransactionRef] = useState('');

    // Memoized values
    const maxAmount = useMemo(() => {
        const remaining = payment?.remaining_amount;
        if (typeof remaining === 'number') return remaining;
        if (typeof remaining === 'string') return parseFloat(remaining) || 0;
        return 0;
    }, [payment?.remaining_amount]);

    const feeName = payment?.fee_name || payment?.class_level_cost_details?.name || t('parent_dashboard.schoolFees');

    // Check if payment is already fully paid
    const isAlreadyPaid = useMemo(() => {
        return maxAmount <= 0;
    }, [maxAmount]);

    // Initialize amount after hooks are declared
    useEffect(() => {
        if (isAlreadyPaid) {
            setError('This payment has already been fully paid.');
            setAmount(0);
        } else {
            setAmount(maxAmount);
        }
    }, [maxAmount, isAlreadyPaid]);

    // If already paid, show error and close
    useEffect(() => {
        if (isAlreadyPaid && step === 'form') {
            toast.error('This payment has already been completed.');
            setTimeout(() => onClose(), 2000);
        }
    }, [isAlreadyPaid, step, onClose]);

    const handleSubmit = async () => {
        if (isAlreadyPaid) {
            setError('This payment has already been completed.');
            return;
        }

        if (!phoneNumber || phoneNumber.length < 10) {
            setError(t('parent_dashboard.validPhoneRequired'));
            return;
        }

        if (amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amount > maxAmount) {
            setError(`Amount cannot exceed remaining balance of ${maxAmount.toFixed(2)} FRW`);
            return;
        }

        setLoading(true);
        setStep('processing');
        setError('');

        try {
            // Clean phone number (remove + if present)
            const cleanPhone = phoneNumber.replace(/^\+/, '');
            
            // 1. Authenticate with Paypack
            console.log('Authenticating with Paypack...');
            const auth = await paypackAPI.authenticate();
            const accessToken = auth.access;

            if (!accessToken) {
                throw new Error(t('parent_dashboard.authFailed'));
            }
            console.log('Authentication successful');

            // 2. Initiate payment
            console.log('Initiating payment...', { phoneNumber: cleanPhone, amount });
            const paymentResult = await paypackAPI.cashin(phoneNumber, amount, accessToken);
            console.log('Payment result:', paymentResult);

            if (paymentResult.status === 'success' || paymentResult.ref) {
                const ref = paymentResult.ref || paymentResult.transaction_ref;
                setTransactionRef(ref);
                console.log('Transaction initiated with ref:', ref);
                
                toast.success('Payment request sent to your phone. Please enter your PIN.');

                await new Promise(resolve => setTimeout(resolve, 8000));

                let retryCount = 0;
                const maxRetries = 15;
                let transactionCompleted = false;

                while (retryCount < maxRetries && !transactionCompleted) {
                    console.log(`Checking transaction status (attempt ${retryCount + 1}/${maxRetries})...`);
                    
                    const status = await paypackAPI.checkTransaction(ref, accessToken);
                    console.log('Transaction status:', status);

                    // Check if transaction is successful - look for completed data
                    if (status.status === 'success') {
                        transactionCompleted = true;
                        console.log('Transaction completed successfully!');
                        
                        const paymentId = payment?.id || payment?.payment_id;
                        const backendResponse = await apiClient.post('/payments/make-payment/', {
                            payment_assignment_id: paymentId,
                            amount: amount,
                            payment_method: 'mobile_money',
                            phone_number: cleanPhone,
                            mobile_money_provider: 'mtn',
                            transaction_reference: ref,
                            notes: `${t('parent_dashboard.paymentViaPaypack')} ${new Date().toISOString()}`
                        });

                        if (backendResponse.data.success) {
                            setStep('success');
                            toast.success(t('parent_dashboard.paymentSuccess'));
                            setTimeout(() => {
                                onSuccess();
                                onClose();
                            }, 2000);
                        } else {
                            throw new Error(backendResponse.data.message || 'Backend submission failed');
                        }
                        break;
                    } 
                    else if (status.data && status.data.amount && status.data.client && status.data.kind) {
                        transactionCompleted = true;
                        console.log('Transaction found - assuming success!');
                        
                        const paymentId = payment?.id || payment?.payment_id;
                        const backendResponse = await apiClient.post('/payments/make-payment/', {
                            payment_assignment_id: paymentId,
                            amount: amount,
                            payment_method: 'mobile_money',
                            phone_number: cleanPhone,
                            mobile_money_provider: 'mtn',
                            transaction_reference: ref,
                            notes: `${t('parent_dashboard.paymentViaPaypack')} ${new Date().toISOString()}`
                        });

                        if (backendResponse.data.success) {
                            setStep('success');
                            toast.success(t('parent_dashboard.paymentSuccess'));
                            setTimeout(() => {
                                onSuccess();
                                onClose();
                            }, 2000);
                        } else {
                            throw new Error(backendResponse.data.message || 'Backend submission failed');
                        }
                        break;
                    }
                    else {
                        console.log(`Transaction still pending. Waiting...`);
                        const waitTime = Math.min(5000 + (retryCount * 2000), 15000);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        retryCount++;
                    }
                }
                
                if (!transactionCompleted) {
                    const finalCheck = await paypackAPI.checkTransaction(ref, accessToken);
                    if (finalCheck.data && finalCheck.data.amount && finalCheck.data.client) {
                        const paymentId = payment?.id || payment?.payment_id;
                        await apiClient.post('/payments/make-payment/', {
                            payment_assignment_id: paymentId,
                            amount: amount,
                            payment_method: 'mobile_money',
                            phone_number: cleanPhone,
                            mobile_money_provider: 'mtn',
                            transaction_reference: ref,
                            notes: `${t('parent_dashboard.paymentViaPaypack')} ${new Date().toISOString()} (Delayed confirmation)`
                        });
                        setStep('success');
                        toast.success(t('parent_dashboard.paymentSuccess'));
                        setTimeout(() => {
                            onSuccess();
                            onClose();
                        }, 2000);
                    } else {
                        setError('Payment is taking longer than expected. Please check your phone. The transaction will be processed automatically once confirmed.');
                        setStep('error');
                    }
                }
            } else {
                throw new Error(paymentResult.message || t('parent_dashboard.initiationFailed'));
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.message || t('parent_dashboard.paymentFailed'));
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full mx-4 p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">{t('parent_dashboard.paymentSuccessful')}</h2>
                    <p className="text-gray-500 mb-4">{amount.toFixed(2)} FRW {t('parent_dashboard.paymentProcessed')}</p>
                    <p className="text-xs text-gray-400">{t('parent_dashboard.transactionRef')}: {transactionRef}</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg">
                        {t('parent_dashboard.close')}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full mx-4 p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertOctagon className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">{t('parent_dashboard.paymentFailed')}</h2>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <div className="flex gap-3">
                        <button onClick={() => { setStep('form'); setError(''); }} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">
                            {t('parent_dashboard.tryAgain')}
                        </button>
                        <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">
                            {t('parent_dashboard.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'processing') {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full mx-4 p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
                    <div className="space-y-2 text-left mb-4">
                        <p className="text-sm">1. Check your phone for the payment prompt</p>
                        <p className="text-sm">2. Enter your mobile money PIN</p>
                        <p className="text-sm">3. Wait for confirmation</p>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-300">
                            ⚠️ Do not close this window. The transaction will be confirmed automatically.
                        </p>
                    </div>
                    <div className="mt-4">
                        <Spinner />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Transaction Ref: {transactionRef?.substring(0, 8)}...
                    </p>
                    <button 
                        onClick={() => setStep('form')}
                        className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Form view (default)
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{t('parent_dashboard.makePayment')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('parent_dashboard.feeName')}</label>
                        <p className="text-gray-800 dark:text-white font-semibold">{feeName}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('parent_dashboard.amountToPay')}</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            max={maxAmount}
                            min={0.01}
                            step={0.01}
                            disabled={isAlreadyPaid}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('parent_dashboard.maxAmount')}: {maxAmount.toFixed(2)} FRW</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('parent_dashboard.phoneNumber')}</label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="078XXXXXXX"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter phone number in format: 078XXXXXXX</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading || amount <= 0 || !phoneNumber || isAlreadyPaid}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Spinner /> : <Wallet className="w-4 h-4" />}
                        {loading ? t('parent_dashboard.processing') : `${t('parent_dashboard.pay')} ${amount.toFixed(2)} FRW`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Student Selector Component
// ============================================================
const StudentSelector = ({ students, selectedStudent, onSelect, t }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl border-2 border-green-200 dark:border-green-800 w-full md:w-auto"
            >
                <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold">
                    {selectedStudent?.full_name?.[0] || 'S'}
                </div>
                <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedStudent?.full_name}</p>
                    <p className="text-xs text-gray-500">{t('parent_dashboard.rollNumber')}: {selectedStudent?.roll_number}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-64 overflow-y-auto">
                        {students.map(student => (
                            <button
                                key={student.id}
                                onClick={() => {
                                    onSelect(student);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 p-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left ${selectedStudent?.id === student.id ? 'bg-green-50 dark:bg-green-900/20' : ''
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">
                                    {student.full_name?.[0] || 'S'}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-white">{student.full_name}</p>
                                    <p className="text-xs text-gray-500">{t('parent_dashboard.class')}: {student.current_class_level?.name || 'N/A'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// ============================================================
// Academic Report Modal
// ============================================================
const AcademicReportModal = ({ student, reportData, onClose, t }) => {
    const [selectedTerm, setSelectedTerm] = useState(null);

    const terms = useMemo(() => {
        if (!reportData?.term_performances) return [];
        return reportData.term_performances;
    }, [reportData]);

    const currentPerformance = useMemo(() => {
        if (selectedTerm) {
            return terms.find(term => term.term_id === selectedTerm);
        }
        return terms.find(term => term.is_current) || terms[0];
    }, [terms, selectedTerm]);

    const handlePrint = () => { window.print(); };

    const handleDownload = () => {
        const dataStr = JSON.stringify(reportData, null, 2);
        const link = document.createElement('a');
        link.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
        link.setAttribute('download', `academic_report_${student.roll_number}_${new Date().toISOString().split('T')[0]}.json`);
        link.click();
        toast.success(t('parent_dashboard.reportDownloaded'));
    };

    if (!reportData) return null;

    // ── Color tokens matching the main dashboard ──
    const C = {
        primary:       '#15803d', // green-700  (buttons, headers, borders)
        primaryDark:   '#166534', // green-800  (hover states)
        primaryLight:  '#f0fdf4', // green-50   (light fills, alternating rows)
        primaryBorder: '#bbf7d0', // green-200  (table borders)
        accent:        '#d97706', // amber-600  (grade scale header, logo icon)
        accentLight:   '#fef3c7', // amber-100  (C-grade fill)
        accentDark:    '#92400e', // amber-800  (C-grade text)
        gradeA_bg:     '#15803d', // green-700
        gradeA_text:   '#ffffff',
        gradeB_bg:     '#d97706', // amber-600
        gradeB_text:   '#ffffff',
        gradeC_bg:     '#fef3c7', // amber-100
        gradeC_text:   '#92400e', // amber-800
        gradeD_bg:     '#dcfce7', // green-100
        gradeD_text:   '#166534', // green-800
        gradeF_bg:     '#f3f4f6', // gray-100
        gradeF_text:   '#6b7280', // gray-500
        rowEven:       '#ffffff',
        rowOdd:        '#f0fdf4', // green-50
        totalRowBg:    '#dcfce7', // green-100
        totalRowText:  '#166534', // green-800
        white:         '#ffffff',
        text:          '#1a1a1a',
        textMuted:     '#6b7280',
    };

    const getGradeBg = (grade) => {
        if (grade === 'A') return { bg: C.gradeA_bg, color: C.gradeA_text };
        if (grade === 'B') return { bg: C.gradeB_bg, color: C.gradeB_text };
        if (grade === 'C') return { bg: C.gradeC_bg, color: C.gradeC_text };
        if (grade === 'D') return { bg: C.gradeD_bg, color: C.gradeD_text };
        if (grade === 'E') return { bg: C.gradeE_bg, color: C.gradeE_text };
        return { bg: C.gradeF_bg, color: C.gradeF_text };
    };

    const getScoreBg    = (s) => s >= 90 ? C.gradeA_bg : s >= 80 ? C.gradeB_bg : s >= 70 ? C.gradeC_bg : s >= 60 ? C.gradeD_bg : s >= 30 ? C.gradeE_bg : C.gradeF_bg;
    const getScoreColor = (s) => s >= 80 ? C.white : s >= 60 ? C.accentDark : C.gradeF_text;

    // Grade scale rows
    const gradeScale = [
        { range: '90–100', grade: 'A' },
        { range: '80–89',  grade: 'B' },
        { range: '70–79',  grade: 'C' },
        { range: '60–69',  grade: 'D' },
        { range: '30–59', grade: 'E' },
        { range: '0–29',  grade: 'F' },

    ];

    // Build subject rows across all terms
    const subjectMap = {};
    terms.forEach((term, idx) => {
        (term.subject_results || []).forEach(sub => {
            if (!subjectMap[sub.subject_name]) subjectMap[sub.subject_name] = { scores: {} };
            subjectMap[sub.subject_name].scores[idx] = sub.final_percentage ?? null;
        });
    });

    const subjectRows = Object.entries(subjectMap).map(([name, data]) => {
        const scores = terms.map((_, i) => data.scores[i] ?? null);
        const valid  = scores.filter(s => s !== null);
        const avg    = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
        const grade  = avg === null ? 'F' : avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : avg >= 30 ? 'E' : 'F';
        return { name, scores, avg, grade };
    });

    const allAvgs  = subjectRows.map(r => r.avg).filter(a => a !== null);
    const totalAvg = allAvgs.length > 0 ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length : null;
    const totalGrade = totalAvg === null ? 'F' : totalAvg >= 90 ? 'A' : totalAvg >= 80 ? 'B' : totalAvg >= 70 ? 'C' : totalAvg >= 60 ? 'D' : totalAvg >= 30 ? 'E' : 'F';

    // ── Inline styles ──
    const S = {
        overlay: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '16px',
        },
        modal: {
            background: C.white, borderRadius: '12px', maxWidth: '920px',
            width: '100%', maxHeight: '92vh', overflowY: 'auto',
            fontFamily: "'Georgia', 'Times New Roman', serif", color: C.text,
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        },
        stickyBar: {
            position: 'sticky', top: 0, background: C.white,
            borderBottom: `3px solid ${C.primary}`,
            padding: '10px 20px', display: 'flex', justifyContent: 'flex-end',
            gap: '8px', zIndex: 10,
        },
        outlineBtn: {
            background: 'transparent', border: `1px solid ${C.primary}`,
            borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
            color: C.primary, display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '13px', fontFamily: 'sans-serif', fontWeight: '500',
        },
        solidBtn: {
            background: C.primary, border: 'none',
            borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
            color: C.white, display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '13px', fontFamily: 'sans-serif', fontWeight: '500',
        },
        body: { padding: '24px 28px' },
        headerRow: {
            display: 'flex', alignItems: 'center', gap: '20px',
            marginBottom: '20px', paddingBottom: '16px',
            borderBottom: `3px solid ${C.primary}`,
        },
        logoBox: {
            width: '80px', height: '80px', borderRadius: '8px',
            background: C.primary, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        },
        logoText: {
            color: C.white, fontSize: '9px', fontWeight: 'bold',
            textAlign: 'center', marginTop: '4px', lineHeight: '1.3',
            fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px',
        },
        reportTitle: {
            fontSize: '28px', fontWeight: 'bold', color: C.primary,
            margin: 0, fontFamily: "'Georgia', serif",
        },
        // Info grid
        infoTable: {
            width: '100%', borderCollapse: 'collapse',
            marginBottom: '20px', fontFamily: 'sans-serif', fontSize: '13px',
        },
        infoTd:    { border: `1px solid ${C.primary}`, padding: '7px 12px' },
        infoLabel: { background: C.primaryLight, color: C.primary, fontWeight: '600', width: '145px' },
        infoValue: { color: C.text },
        // Section headers
        greenHeader: {
            background: C.primary, color: C.white,
            padding: '8px 14px', fontSize: '14px', fontWeight: 'bold',
            fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0',
        },
        amberHeader: {
            background: C.accent, color: C.white,
            padding: '8px 14px', fontSize: '14px', fontWeight: 'bold',
            fontFamily: 'sans-serif', borderRadius: '4px 4px 0 0',
        },
        // Grade table
        gradeTable: { width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '13px' },
        th: {
            background: C.primary, color: C.white,
            padding: '8px 10px', textAlign: 'center',
            border: `1px solid ${C.primary}`, fontWeight: '600', whiteSpace: 'nowrap',
        },
        thLeft: {
            background: C.primary, color: C.white,
            padding: '8px 12px', textAlign: 'left',
            border: `1px solid ${C.primary}`, fontWeight: '600',
        },
        tdSubject: {
            padding: '7px 12px', border: `1px solid ${C.primaryBorder}`,
            fontWeight: '500', color: C.text,
        },
        tdScore: {
            padding: '7px 10px', border: `1px solid ${C.primaryBorder}`,
            textAlign: 'center', fontWeight: '500',
        },
        tdTotalLabel: {
            padding: '8px 12px', border: `1px solid ${C.primary}`,
            fontWeight: 'bold', background: C.totalRowBg, color: C.totalRowText,
            fontFamily: 'sans-serif',
        },
        tdTotalCell: {
            padding: '8px 10px', border: `1px solid ${C.primary}`,
            textAlign: 'center', fontWeight: 'bold', background: C.totalRowBg,
            color: C.totalRowText,
        },
        // Scale table
        scaleTable: { width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '13px' },
        scaleTh: {
            padding: '7px 10px', textAlign: 'left',
            border: `1px solid ${C.primaryBorder}`, background: C.primaryLight,
            color: C.primary, fontWeight: '600',
        },
        scaleTd: { padding: '7px 10px', border: `1px solid ${C.primaryBorder}`, textAlign: 'center' },
        // Discipline cards
        disciplineGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' },
        disciplineCard: {
            background: C.primaryLight, borderRadius: '6px',
            padding: '12px 10px', textAlign: 'center', border: `1px solid ${C.primaryBorder}`,
        },
        disciplineLabel: {
            fontSize: '11px', color: C.primary, fontFamily: 'sans-serif',
            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        },
        disciplineValue: {
            fontSize: '24px', fontWeight: 'bold', color: C.primary,
            fontFamily: "'Georgia', serif", marginTop: '4px',
        },
        remarks: {
            marginTop: '16px', padding: '12px 16px',
            background: C.primaryLight, borderLeft: `4px solid ${C.primary}`,
            borderRadius: '0 6px 6px 0', fontSize: '13px',
            fontFamily: 'sans-serif', color: C.text,
        },
        footer: {
            marginTop: '24px', paddingTop: '14px',
            borderTop: `2px solid ${C.primaryBorder}`,
            textAlign: 'center', fontSize: '12px',
            color: C.textMuted, fontFamily: 'sans-serif',
        },
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal}>

                {/* ── Action bar ── */}
                <div style={S.stickyBar} className="print:hidden">
                    <button onClick={handleDownload} style={S.outlineBtn}>
                        <Download className="w-4 h-4" /> {t('parent_dashboard.download') || 'Download'}
                    </button>
                    <button onClick={handlePrint} style={S.outlineBtn}>
                        <Printer className="w-4 h-4" /> {t('parent_dashboard.print') || 'Print'}
                    </button>
                    <button onClick={onClose} style={S.solidBtn}>
                        <X className="w-4 h-4" /> {t('parent_dashboard.close')}
                    </button>
                </div>

                <div style={S.body}>

                    {/* ── Header ── */}
                    <div style={S.headerRow}>
                        <div style={S.logoBox}>
                            <GraduationCap size={32} color={C.accent} />
                            <div style={S.logoText}>
                                Les Hirondelles<br />de Don Bosco
                            </div>
                        </div>
                        <div>
                            <h1 style={S.reportTitle}>Student Performance Report</h1>
                            <p style={{ margin: '4px 0 0', fontFamily: 'sans-serif', fontSize: '13px', color: C.textMuted }}>
                                {t('parent_dashboard.academicReport')}
                            </p>
                        </div>
                    </div>

                    {/* ── Student info ── */}
                    <table style={S.infoTable}>
                        <tbody>
                            <tr>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('parent_dashboard.studentName')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.full_name}</td>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('parent_dashboard.classLevel')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.current_class_level?.name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('parent_dashboard.academicYear')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{reportData.academic_year_name}</td>
                                <td style={{ ...S.infoTd, ...S.infoLabel }}>{t('parent_dashboard.rollNumber')}</td>
                                <td style={{ ...S.infoTd, ...S.infoValue }}>{student.roll_number}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ── Grades table + Scale ── */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                        {/* Left: grades */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={S.greenHeader}>Semestral Grades and Final Performance</div>
                            <table style={S.gradeTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...S.thLeft, minWidth: '130px' }}>{t('parent_dashboard.subject')}</th>
                                        {terms.map(term => (
                                            <th key={term.term_id} style={S.th}>{term.term_name}</th>
                                        ))}
                                        <th style={S.th}>{t('parent_dashboard.overallAverage')}</th>
                                        <th style={S.th}>{t('parent_dashboard.grade')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectRows.map((row, idx) => {
                                        const rowBg = idx % 2 === 0 ? C.rowEven : C.rowOdd;
                                        return (
                                            <tr key={row.name}>
                                                <td style={{ ...S.tdSubject, background: rowBg }}>{row.name}</td>
                                                {row.scores.map((score, si) => (
                                                    <td key={si} style={{
                                                        ...S.tdScore,
                                                        background: score !== null ? getScoreBg(score) : rowBg,
                                                        color: score !== null ? getScoreColor(score) : C.textMuted,
                                                    }}>
                                                        {score !== null ? score.toFixed(1) : '—'}
                                                    </td>
                                                ))}
                                                <td style={{
                                                    ...S.tdScore,
                                                    background: row.avg !== null ? getScoreBg(row.avg) : C.gradeF_bg,
                                                    color: row.avg !== null ? getScoreColor(row.avg) : C.textMuted,
                                                    fontWeight: 'bold',
                                                }}>
                                                    {row.avg !== null ? row.avg.toFixed(2) : '—'}
                                                </td>
                                                <td style={{
                                                    ...S.tdScore,
                                                    background: getGradeBg(row.grade).bg,
                                                    color: getGradeBg(row.grade).color,
                                                    fontWeight: 'bold', fontSize: '14px',
                                                }}>
                                                    {row.grade}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total row */}
                                    <tr>
                                        <td style={S.tdTotalLabel}>{t('parent_dashboard.overallAverage')}</td>
                                        {terms.map((_, i) => <td key={i} style={S.tdTotalCell} />)}
                                        <td style={{
                                            ...S.tdTotalCell,
                                            background: totalAvg !== null ? getScoreBg(totalAvg) : C.totalRowBg,
                                            color: totalAvg !== null ? getScoreColor(totalAvg) : C.totalRowText,
                                            fontSize: '14px',
                                        }}>
                                            {totalAvg !== null ? totalAvg.toFixed(2) : '—'}
                                        </td>
                                        <td style={{
                                            ...S.tdTotalCell,
                                            background: getGradeBg(totalGrade).bg,
                                            color: getGradeBg(totalGrade).color,
                                            fontSize: '14px',
                                        }}>
                                            {totalGrade}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Right: grade scale */}
                        <div style={{ width: '155px', flexShrink: 0 }}>
                            <div style={S.amberHeader}>Grade Scale</div>
                            <table style={S.scaleTable}>
                                <thead>
                                    <tr>
                                        <th style={S.scaleTh}>Range</th>
                                        <th style={{ ...S.scaleTh, textAlign: 'center' }}>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradeScale.map(({ range, grade }) => {
                                        const { bg, color } = getGradeBg(grade);
                                        return (
                                            <tr key={grade}>
                                                <td style={{ ...S.scaleTd, textAlign: 'left', paddingLeft: '10px', background: bg, color, fontWeight: '500' }}>
                                                    {range}
                                                </td>
                                                <td style={{ ...S.scaleTd, background: bg, color, fontWeight: 'bold', fontSize: '15px' }}>
                                                    {grade}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Discipline & Attendance ── */}
                    {currentPerformance?.discipline && (
                        <div style={{ marginTop: '24px' }}>
                            <div style={S.greenHeader}>{t('parent_dashboard.disciplineAttendance')}</div>
                            <div style={S.disciplineGrid}>
                                {[
                                    { label: t('parent_dashboard.attendanceRate'), value: `${(currentPerformance.discipline.attendance_rate ?? 0).toFixed(1)}%` },
                                    { label: t('parent_dashboard.present'),         value: currentPerformance.discipline.present ?? 0 },
                                    { label: t('parent_dashboard.absent'),          value: currentPerformance.discipline.absent ?? 0 },
                                    { label: t('parent_dashboard.late'),            value: currentPerformance.discipline.late ?? 0 },
                                ].map(item => (
                                    <div key={item.label} style={S.disciplineCard}>
                                        <div style={S.disciplineLabel}>{item.label}</div>
                                        <div style={S.disciplineValue}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Remarks ── */}
                    {currentPerformance?.remarks && (
                        <div style={S.remarks}>
                            <strong style={{ color: C.primary }}>Remarks: </strong>
                            {currentPerformance.remarks}
                        </div>
                    )}

                    {/* ── Footer ── */}
                    <div style={S.footer}>
                        <p style={{ margin: '0 0 4px' }}>
                            Les Hirondelles de Don Bosco — {t('parent_dashboard.qualityEducation')}
                        </p>
                        <p style={{ margin: 0 }}>
                            {t('parent_dashboard.generatedOn')}: {new Date().toLocaleDateString()} &nbsp;|&nbsp; {t('parent_dashboard.reportFooter')}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

// ============================================================
// Main Parent Dashboard Component
// ============================================================
const ParentDashboard = () => {
    const { t } = useTranslation();

    // State
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [parentProfile, setParentProfile] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [paymentData, setPaymentData] = useState([]);
    const [paymentSummary, setPaymentSummary] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [loadingPerformance, setLoadingPerformance] = useState(false);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);
    const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
    const [academicYears, setAcademicYears] = useState([]);

    // Fetch parent profile and students
    const fetchParentData = useCallback(async () => {
        setLoading(true);
        try {
            const parentRes = await apiClient.get('/students/parents/me/');
            if (parentRes.data.success) {
                setParentProfile(parentRes.data.data);
                const studentList = parentRes.data.data.students || [];
                setStudents(studentList);
                if (studentList.length > 0) {
                    setSelectedStudent(studentList[0]);
                }
            }

            const yearRes = await apiClient.get('/academics/academic-years/');
            const years = yearRes.data.data?.results || yearRes.data.data || [];
            setAcademicYears(years);
            const current = years.find(y => y.is_current);
            if (current) setCurrentAcademicYear(current);

        } catch (error) {
            console.error('Error fetching parent data:', error);
            toast.error(t('parent_dashboard.fetchError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    // Fetch student performance
    const fetchStudentPerformance = useCallback(async (studentId, academicYearId) => {
        if (!studentId) return;
        setLoadingPerformance(true);
        try {
            const url = `/academics-records/performance/student/${studentId}/`;
            const params = new URLSearchParams();
            if (academicYearId) params.append('academic_year_id', academicYearId);
            const res = await apiClient.get(`${url}?${params.toString()}`);
            if (res.data.success) {
                setPerformanceData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching performance:', error);
            toast.error(t('parent_dashboard.performanceError'));
        } finally {
            setLoadingPerformance(false);
        }
    }, [t]);

    // Fetch student payments

    const fetchStudentPayments = useCallback(async (studentId) => {
        if (!studentId) return;
        setLoadingPayments(true);
        try {
            const res = await apiClient.get(`/payments/student/${studentId}/`);
            console.log('Payments response:', res.data);

            if (res.data.success) {
                const payments = res.data.data || [];
                setPaymentData(payments);

                const summary = {
                    total_assigned: 0,
                    total_paid: 0,
                    total_remaining: 0,
                    completed_count: 0,
                    pending_count: 0,
                    overdue_count: 0,
                    is_fully_paid: true
                };

                payments.forEach(p => {
                    // Convert to numbers - note: amounts are in FRW, not USD
                    const totalAmount = typeof p.total_amount === 'number' ? p.total_amount : parseFloat(p.total_amount) || 0;
                    const paidAmount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(p.paid_amount) || 0;
                    const remainingAmount = typeof p.remaining_amount === 'number' ? p.remaining_amount : parseFloat(p.remaining_amount) || 0;

                    console.log(`Payment ${p.id}: Total={totalAmount}, Paid=${paidAmount}, Remaining=${remainingAmount} FRW`);

                    summary.total_assigned += totalAmount;
                    summary.total_paid += paidAmount;
                    summary.total_remaining += remainingAmount;

                    if (p.status === 'completed') summary.completed_count++;
                    if (p.status === 'overdue') summary.overdue_count++;
                    if (p.status !== 'completed') summary.pending_count++;
                    if (remainingAmount > 0) summary.is_fully_paid = false;
                });

                // Round to 2 decimal places
                summary.total_assigned = Number(summary.total_assigned.toFixed(2));
                summary.total_paid = Number(summary.total_paid.toFixed(2));
                summary.total_remaining = Number(summary.total_remaining.toFixed(2));

                console.log('Payment summary:', summary);
                setPaymentSummary(summary);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error(t('parent_dashboard.fetchError'));
        } finally {
            setLoadingPayments(false);
        }
    }, [t]);

    // Fetch full academic report
    const fetchAcademicReport = useCallback(async (studentId, academicYearId) => {
        if (!studentId) return;

        if (!paymentSummary?.is_fully_paid) {
            toast.error(t('parent_dashboard.paymentRequiredForReport'));
            return;
        }

        setLoadingReport(true);
        try {
            const url = `/academics-records/performance/student/${studentId}/full-report/`;
            const params = new URLSearchParams();
            if (academicYearId) params.append('academic_year_id', academicYearId);
            const res = await apiClient.get(`${url}?${params.toString()}`);
            if (res.data.success) {
                setReportData(res.data.data);
                setShowReportModal(true);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error(t('parent_dashboard.reportError'));
        } finally {
            setLoadingReport(false);
        }
    }, [paymentSummary, t]);

    // Handle student selection
    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
        setPerformanceData(null);
        fetchStudentPerformance(student.id, currentAcademicYear?.id);
        fetchStudentPayments(student.id);
    };

    // Handle payment initiation
    const handlePaymentClick = (payment) => {
        // Create a safe payment object with proper numeric values
        const safePayment = {
            id: payment.id,
            fee_name: payment.fee_name || payment.class_level_cost_details?.name || 'School Fees',
            remaining_amount: typeof payment.remaining_amount === 'number'
                ? payment.remaining_amount
                : parseFloat(payment.remaining_amount) || 0,
            total_amount: typeof payment.total_amount === 'number'
                ? payment.total_amount
                : parseFloat(payment.total_amount) || 0,
            paid_amount: typeof payment.paid_amount === 'number'
                ? payment.paid_amount
                : parseFloat(payment.paid_amount) || 0,
            status: payment.status,
            status_display: payment.status_display,
            due_date: payment.payment_due_date || payment.due_date,
            class_level_cost_details: payment.class_level_cost_details
        };

        setSelectedPayment(safePayment);
        setShowPaymentModal(true);
    };

    // Handle successful payment
    // Updated handlePaymentSuccess function in ParentDashboard
    const handlePaymentSuccess = async () => {
        console.log('Payment success callback triggered');

        // First, clear the selected payment to prevent duplicate payments
        setSelectedPayment(null);
        setShowPaymentModal(false);

        // Refresh payment data for the current student
        if (selectedStudent) {
            console.log('Refreshing payment data for student:', selectedStudent.id);
            await fetchStudentPayments(selectedStudent.id);
        }

        toast.success('Payment completed successfully!');
    };

    // Handle view full report
    const handleViewReport = () => {
        if (selectedStudent) {
            fetchAcademicReport(selectedStudent.id, currentAcademicYear?.id);
        }
    };

    // Handle chat navigation
    const handleChat = () => {
        window.location.href = '/parent/chats';
    };

    // Initial load
    useEffect(() => {
        fetchParentData();
    }, [fetchParentData]);

    // Load data when student changes
    useEffect(() => {
        if (selectedStudent && currentAcademicYear) {
            fetchStudentPerformance(selectedStudent.id, currentAcademicYear.id);
            fetchStudentPayments(selectedStudent.id);
        }
    }, [selectedStudent, currentAcademicYear, fetchStudentPerformance, fetchStudentPayments]);

    // Performance chart data
    const chartData = useMemo(() => {
        if (!performanceData) return null;
        return {
            overallAverage: performanceData.academic_performance?.overall_average || 0,
            disciplineScore: performanceData.discipline?.discipline_score || 0,
            attendanceRate: performanceData.discipline?.attendance_rate || 0,
            subjectsPassed: performanceData.academic_performance?.subjects_passed || 0,
            subjectsFailed: performanceData.academic_performance?.subjects_failed || 0,
            totalSubjects: performanceData.academic_performance?.total_subjects || 0,
            subjectResults: performanceData.academic_performance?.subject_results || [],
            grade_letter: performanceData.academic_performance?.grade_letter || 'N/A'
        };
    }, [performanceData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-500">{t('parent_dashboard.loading')}</p>
                </div>
            </div>
        );
    }

    if (!parentProfile || students.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center p-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('parent_dashboard.noStudentsTitle')}
                    </h2>
                    <p className="text-gray-500">{t('parent_dashboard.noStudentsMessage')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 md:p-6">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            {t('parent_dashboard.title')}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {t('parent_dashboard.welcome')}, {parentProfile?.full_name}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleChat}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            {t('parent_dashboard.chat')}
                        </button>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm"
                        >
                            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
                        </button>
                    </div>
                </div>

                {/* Student Selector */}
                <div className="mb-6">
                    <StudentSelector
                        students={students}
                        selectedStudent={selectedStudent}
                        onSelect={handleStudentSelect}
                        t={t}
                    />
                </div>


                {/* Payment Summary Banner - with safe number formatting */}
                {paymentSummary && (
                    <div className={`mb-6 p-4 rounded-xl border ${paymentSummary.is_fully_paid
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                        : paymentSummary.overdue_count > 0
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
                        }`}>
                        <div className="flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                                {paymentSummary.is_fully_paid ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : paymentSummary.overdue_count > 0 ? (
                                    <AlertOctagon className="w-6 h-6 text-red-600" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                                )}
                                <div>
                                    <p className="font-semibold">
                                        {paymentSummary.is_fully_paid
                                            ? t('parent_dashboard.feesFullyPaid')
                                            : t('parent_dashboard.feesOutstanding')}
                                    </p>
                                    <p className="text-sm">
                                        {t('parent_dashboard.remainingBalance')}: {(typeof paymentSummary.total_remaining === 'number' ? paymentSummary.total_remaining : 0).toFixed(2)} FRW
                                    </p>
                                </div>
                            </div>
                            {!paymentSummary.is_fully_paid && (
                                <button
                                    onClick={() => {
                                        const unpaidPayment = paymentData.find(p => parseFloat(p.remaining_amount) > 0);
                                        if (unpaidPayment) handlePaymentClick(unpaidPayment);
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
                                >
                                    <Wallet className="w-4 h-4" /> {t('parent_dashboard.payNow')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Performance Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Performance Overview */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                {t('parent_dashboard.performanceOverview')}
                            </h2>

                            {loadingPerformance ? (
                                <div className="py-8 text-center">
                                    <Spinner />
                                    <p className="mt-2 text-gray-500">{t('parent_dashboard.loadingPerformance')}</p>
                                </div>
                            ) : chartData ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <PerformanceChart percentage={chartData.overallAverage} label={t('parent_dashboard.overallAverage')} />
                                            <PerformanceChart percentage={chartData.disciplineScore} label={t('parent_dashboard.disciplineScore')} />
                                            <PerformanceChart percentage={chartData.attendanceRate} label={t('parent_dashboard.attendanceRate')} />
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="relative w-32 h-32 mx-auto">
                                                    <svg className="w-32 h-32 transform -rotate-90">
                                                        <circle
                                                            cx="64" cy="64" r="56"
                                                            stroke="#e5e7eb" strokeWidth="12"
                                                            fill="none"
                                                        />
                                                        <circle
                                                            cx="64" cy="64" r="56"
                                                            stroke={chartData.overallAverage >= 80 ? '#22c55e' : chartData.overallAverage >= 50 ? '#eab308' : '#ef4444'}
                                                            strokeWidth="12"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 56}`}
                                                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - chartData.overallAverage / 100)}`}
                                                            className="transition-all duration-500"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                                                            {chartData.overallAverage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2">{t('parent_dashboard.overallPerformance')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{chartData.subjectsPassed}</p>
                                            <p className="text-xs text-gray-500">{t('parent_dashboard.subjectsPassed')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-red-600">{chartData.subjectsFailed}</p>
                                            <p className="text-xs text-gray-500">{t('parent_dashboard.subjectsFailed')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-600">{chartData.totalSubjects}</p>
                                            <p className="text-xs text-gray-500">{t('parent_dashboard.totalSubjects')}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {t('parent_dashboard.noPerformanceData')}
                                </div>
                            )}
                        </div>

                        {/* Subject Performance List */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-green-600" />
                                {t('parent_dashboard.subjectPerformance')}
                            </h2>

                            {loadingPerformance ? (
                                <div className="py-8 text-center">
                                    <Spinner />
                                </div>
                            ) : chartData?.subjectResults?.length > 0 ? (
                                <div className="space-y-2">
                                    {chartData.subjectResults.map(subject => (
                                        <SubjectPerformanceCard key={subject.subject_id} subject={subject} t={t} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {t('parent_dashboard.noSubjectData')}
                                </div>
                            )}

                            {/* View Full Report Button */}
                            <button
                                onClick={handleViewReport}
                                disabled={!paymentSummary?.is_fully_paid}
                                className={`w-full mt-6 py-3 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2 ${paymentSummary?.is_fully_paid
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                {t('parent_dashboard.viewFullReport')}
                                {!paymentSummary?.is_fully_paid && (
                                    <span className="text-xs ml-2">({t('parent_dashboard.feesRequired')})</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Payment Status */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Payment Status Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-green-600" />
                                {t('parent_dashboard.paymentStatus')}
                            </h2>

                            {loadingPayments ? (
                                <div className="py-8 text-center">
                                    <Spinner />
                                </div>
                            ) : paymentData.length > 0 ? (
                                <div className="space-y-3">
                                    {paymentData.map(payment => (
                                        <PaymentStatusCard
                                            key={payment.id}
                                            payment={{
                                                id: payment.id,
                                                fee_name: payment.class_level_cost_details?.name || t('parent_dashboard.schoolFees'),
                                                total_amount: payment.total_amount,
                                                paid_amount: payment.paid_amount,
                                                remaining_amount: payment.remaining_amount,
                                                status: payment.status,
                                                status_display: payment.status_display,
                                                due_date: payment.payment_due_date
                                            }}
                                            onPay={handlePaymentClick}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {t('parent_dashboard.noPaymentData')}
                                </div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-6 text-white">
                            <h3 className="font-semibold mb-3">{t('parent_dashboard.quickStats')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>{t('parent_dashboard.overallGrade')}:</span>
                                    <span className="font-bold">{chartData?.grade_letter || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('parent_dashboard.attendance')}:</span>
                                    <span className="font-bold">{chartData?.attendanceRate?.toFixed(1) || 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('parent_dashboard.discipline')}:</span>
                                    <span className="font-bold">{chartData?.disciplineScore?.toFixed(1) || 0}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Modal */}
                {showPaymentModal && selectedPayment && (
                    <PaymentModal
                        payment={selectedPayment}
                        onClose={() => {
                            setShowPaymentModal(false);
                            setSelectedPayment(null);
                        }}
                        onSuccess={handlePaymentSuccess}
                        parentPhone={parentProfile?.phone_number}
                        t={t}
                    />
                )}

                {/* Academic Report Modal */}
                {showReportModal && reportData && selectedStudent && (
                    <AcademicReportModal
                        student={selectedStudent}
                        reportData={reportData}
                        onClose={() => {
                            setShowReportModal(false);
                            setReportData(null);
                        }}
                        t={t}
                    />
                )}

            </div>
        </div>
    );
};

export default ParentDashboard;