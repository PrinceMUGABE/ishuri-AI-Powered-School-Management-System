import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Eye } from 'lucide-react';

const AcademicReport = () => {
  const { t } = useTranslation();
  
  // Mock fee status - change this to 'paid' to show report
  const feeStatus = 'unpaid'; // 'paid' or 'unpaid'
  const isReportUnlocked = feeStatus === 'paid';

  if (!isReportUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card text-center max-w-md">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Academic Report Locked
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your academic report is currently locked due to outstanding school fees.
          </p>
          <div className="p-4 bg-warning/10 rounded-lg">
            <p className="text-sm text-warning">
              Fee Status: {t('fees.unpaid')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Please contact the administration to complete your fee payment.
              Once your fees are fully paid, your academic report will become available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Term 1, 2024 Academic Year</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Eye className="w-4 h-4" />
          View Full Report
        </button>
      </div>

      {/* Report content would go here when unlocked */}
      <div className="card">
        <p className="text-center text-gray-600 dark:text-gray-400 py-8">
          Your academic report is available. Click "View Full Report" to see your detailed results.
        </p>
      </div>
    </div>
  );
};

export default AcademicReport;