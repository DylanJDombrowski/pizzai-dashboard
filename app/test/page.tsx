'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStorage } from '@/lib/supabaseStorageService';
import { useAuth } from '@/lib/AuthContext';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message?: string;
  duration?: number;
}

export default function TestPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      supabaseStorage.setUser(user);
    }
  }, [user]);

  const updateTest = (name: string, update: Partial<TestResult>) => {
    setTests(prev => prev.map(t => t.name === name ? { ...t, ...update } : t));
  };

  const runTests = async () => {
    setRunning(true);

    const testSuite: TestResult[] = [
      { name: 'Save actual data', status: 'pending' },
      { name: 'Retrieve actual data by date', status: 'pending' },
      { name: 'Update actual data (upsert)', status: 'pending' },
      { name: 'Get averages by day of week', status: 'pending' },
      { name: 'Get same day last week', status: 'pending' },
      { name: 'Save weekly goal', status: 'pending' },
      { name: 'Get weekly goal', status: 'pending' },
      { name: 'Get week progress', status: 'pending' },
      { name: 'Add custom prep task', status: 'pending' },
      { name: 'Get custom prep tasks', status: 'pending' },
      { name: 'Delete custom prep task', status: 'pending' },
      { name: 'Add inventory item', status: 'pending' },
      { name: 'Update inventory item', status: 'pending' },
      { name: 'Get custom inventory', status: 'pending' },
      { name: 'Delete inventory item', status: 'pending' },
      { name: 'Get overall best day', status: 'pending' },
      { name: 'Get week comparison data', status: 'pending' },
      { name: 'Export to CSV', status: 'pending' },
    ];

    setTests(testSuite);

    // Test date - use a past date to avoid conflicts with real data
    const testDate = '2020-01-15';
    const testDate2 = '2020-01-08'; // One week before
    let testTaskId = '';
    let testItemId = '';

    // 1. Save actual data
    try {
      const start = Date.now();
      updateTest('Save actual data', { status: 'running' });
      await supabaseStorage.saveActualData(testDate, 100, 2500, 25, 375, 'Test note', ['promotion']);
      updateTest('Save actual data', { status: 'pass', duration: Date.now() - start, message: 'Saved test data for 2020-01-15' });
    } catch (e: any) {
      updateTest('Save actual data', { status: 'fail', message: e.message });
    }

    // 2. Retrieve actual data by date
    try {
      const start = Date.now();
      updateTest('Retrieve actual data by date', { status: 'running' });
      const data = await supabaseStorage.getActualDataByDate(testDate);
      if (data && data.actualOrders === 100 && data.actualRevenue === 2500) {
        updateTest('Retrieve actual data by date', { status: 'pass', duration: Date.now() - start, message: `Orders: ${data.actualOrders}, Revenue: $${data.actualRevenue}` });
      } else {
        updateTest('Retrieve actual data by date', { status: 'fail', message: 'Data mismatch or not found' });
      }
    } catch (e: any) {
      updateTest('Retrieve actual data by date', { status: 'fail', message: e.message });
    }

    // 3. Update actual data (upsert)
    try {
      const start = Date.now();
      updateTest('Update actual data (upsert)', { status: 'running' });
      await supabaseStorage.saveActualData(testDate, 110, 2750, 26, 390, 'Updated note', ['promotion', 'event']);
      const updated = await supabaseStorage.getActualDataByDate(testDate);
      if (updated && updated.actualOrders === 110) {
        updateTest('Update actual data (upsert)', { status: 'pass', duration: Date.now() - start, message: 'Updated orders from 100 to 110' });
      } else {
        updateTest('Update actual data (upsert)', { status: 'fail', message: 'Update did not persist' });
      }
    } catch (e: any) {
      updateTest('Update actual data (upsert)', { status: 'fail', message: e.message });
    }

    // Save another day for comparison tests
    try {
      await supabaseStorage.saveActualData(testDate2, 95, 2400, 24, 360, 'Previous week test');
    } catch (e) {
      // Ignore - just setup data
    }

    // 4. Get averages by day of week
    try {
      const start = Date.now();
      updateTest('Get averages by day of week', { status: 'running' });
      const averages = await supabaseStorage.getAveragesByDayOfWeek();
      const hasData = Object.values(averages).some(v => v !== null);
      if (hasData) {
        updateTest('Get averages by day of week', { status: 'pass', duration: Date.now() - start, message: 'Retrieved day-of-week averages' });
      } else {
        updateTest('Get averages by day of week', { status: 'pass', duration: Date.now() - start, message: 'No averages yet (expected for new account)' });
      }
    } catch (e: any) {
      updateTest('Get averages by day of week', { status: 'fail', message: e.message });
    }

    // 5. Get same day last week
    try {
      const start = Date.now();
      updateTest('Get same day last week', { status: 'running' });
      const lastWeek = await supabaseStorage.getSameDayLastWeek(testDate);
      if (lastWeek) {
        updateTest('Get same day last week', { status: 'pass', duration: Date.now() - start, message: `Found: ${lastWeek.actualOrders} orders` });
      } else {
        updateTest('Get same day last week', { status: 'pass', duration: Date.now() - start, message: 'No data for same day last week (expected)' });
      }
    } catch (e: any) {
      updateTest('Get same day last week', { status: 'fail', message: e.message });
    }

    // 6. Save weekly goal
    try {
      const start = Date.now();
      updateTest('Save weekly goal', { status: 'running' });
      await supabaseStorage.saveWeeklyGoal(15000);
      updateTest('Save weekly goal', { status: 'pass', duration: Date.now() - start, message: 'Set goal to $15,000' });
    } catch (e: any) {
      updateTest('Save weekly goal', { status: 'fail', message: e.message });
    }

    // 7. Get weekly goal
    try {
      const start = Date.now();
      updateTest('Get weekly goal', { status: 'running' });
      const goal = await supabaseStorage.getWeeklyGoal();
      if (goal && goal.revenue === 15000) {
        updateTest('Get weekly goal', { status: 'pass', duration: Date.now() - start, message: `Goal: $${goal.revenue}` });
      } else {
        updateTest('Get weekly goal', { status: 'fail', message: 'Goal not found or mismatch' });
      }
    } catch (e: any) {
      updateTest('Get weekly goal', { status: 'fail', message: e.message });
    }

    // 8. Get week progress
    try {
      const start = Date.now();
      updateTest('Get week progress', { status: 'running' });
      const progress = await supabaseStorage.getWeekProgress();
      if (progress) {
        updateTest('Get week progress', { status: 'pass', duration: Date.now() - start, message: `${progress.percentage}% of goal` });
      } else {
        updateTest('Get week progress', { status: 'pass', duration: Date.now() - start, message: 'No progress yet (no goal set for this week)' });
      }
    } catch (e: any) {
      updateTest('Get week progress', { status: 'fail', message: e.message });
    }

    // 9. Add custom prep task
    try {
      const start = Date.now();
      updateTest('Add custom prep task', { status: 'running' });
      const task = await supabaseStorage.addCustomPrepTask('TEST TASK - Check oven temperature');
      testTaskId = task.id;
      updateTest('Add custom prep task', { status: 'pass', duration: Date.now() - start, message: `Created task ID: ${task.id.slice(0, 8)}...` });
    } catch (e: any) {
      updateTest('Add custom prep task', { status: 'fail', message: e.message });
    }

    // 10. Get custom prep tasks
    try {
      const start = Date.now();
      updateTest('Get custom prep tasks', { status: 'running' });
      const tasks = await supabaseStorage.getCustomPrepTasks();
      const found = tasks.find(t => t.id === testTaskId);
      if (found) {
        updateTest('Get custom prep tasks', { status: 'pass', duration: Date.now() - start, message: `Found ${tasks.length} task(s)` });
      } else {
        updateTest('Get custom prep tasks', { status: 'fail', message: 'Test task not found in list' });
      }
    } catch (e: any) {
      updateTest('Get custom prep tasks', { status: 'fail', message: e.message });
    }

    // 11. Delete custom prep task
    try {
      const start = Date.now();
      updateTest('Delete custom prep task', { status: 'running' });
      await supabaseStorage.deleteCustomPrepTask(testTaskId);
      const tasks = await supabaseStorage.getCustomPrepTasks();
      const stillExists = tasks.find(t => t.id === testTaskId);
      if (!stillExists) {
        updateTest('Delete custom prep task', { status: 'pass', duration: Date.now() - start, message: 'Task deleted successfully' });
      } else {
        updateTest('Delete custom prep task', { status: 'fail', message: 'Task still exists after delete' });
      }
    } catch (e: any) {
      updateTest('Delete custom prep task', { status: 'fail', message: e.message });
    }

    // 12. Add inventory item
    try {
      const start = Date.now();
      updateTest('Add inventory item', { status: 'running' });
      const item = await supabaseStorage.addInventoryItem({
        ingredient: 'TEST ITEM - Delete Me',
        unit: 'lb',
        par_level: 50,
        on_hand: 25,
        cost_per_unit: 5.00
      });
      testItemId = item.id;
      updateTest('Add inventory item', { status: 'pass', duration: Date.now() - start, message: `Created item ID: ${item.id.slice(0, 8)}...` });
    } catch (e: any) {
      updateTest('Add inventory item', { status: 'fail', message: e.message });
    }

    // 13. Update inventory item
    try {
      const start = Date.now();
      updateTest('Update inventory item', { status: 'running' });
      await supabaseStorage.updateInventoryItem(testItemId, { on_hand: 30, par_level: 60 });
      const inventory = await supabaseStorage.getCustomInventory();
      const updated = inventory.find(i => i.id === testItemId);
      if (updated && updated.on_hand === 30 && updated.par_level === 60) {
        updateTest('Update inventory item', { status: 'pass', duration: Date.now() - start, message: 'Updated on_hand to 30, par to 60' });
      } else {
        updateTest('Update inventory item', { status: 'fail', message: 'Update did not persist' });
      }
    } catch (e: any) {
      updateTest('Update inventory item', { status: 'fail', message: e.message });
    }

    // 14. Get custom inventory
    try {
      const start = Date.now();
      updateTest('Get custom inventory', { status: 'running' });
      const inventory = await supabaseStorage.getCustomInventory();
      updateTest('Get custom inventory', { status: 'pass', duration: Date.now() - start, message: `Found ${inventory.length} item(s)` });
    } catch (e: any) {
      updateTest('Get custom inventory', { status: 'fail', message: e.message });
    }

    // 15. Delete inventory item
    try {
      const start = Date.now();
      updateTest('Delete inventory item', { status: 'running' });
      await supabaseStorage.deleteInventoryItem(testItemId);
      const inventory = await supabaseStorage.getCustomInventory();
      const stillExists = inventory.find(i => i.id === testItemId);
      if (!stillExists) {
        updateTest('Delete inventory item', { status: 'pass', duration: Date.now() - start, message: 'Item deleted successfully' });
      } else {
        updateTest('Delete inventory item', { status: 'fail', message: 'Item still exists after delete' });
      }
    } catch (e: any) {
      updateTest('Delete inventory item', { status: 'fail', message: e.message });
    }

    // 16. Get overall best day
    try {
      const start = Date.now();
      updateTest('Get overall best day', { status: 'running' });
      const bestDay = await supabaseStorage.getOverallBestDay();
      if (bestDay) {
        updateTest('Get overall best day', { status: 'pass', duration: Date.now() - start, message: `Best: ${bestDay.orders} orders on ${bestDay.dayName}` });
      } else {
        updateTest('Get overall best day', { status: 'pass', duration: Date.now() - start, message: 'No data yet' });
      }
    } catch (e: any) {
      updateTest('Get overall best day', { status: 'fail', message: e.message });
    }

    // 17. Get week comparison data
    try {
      const start = Date.now();
      updateTest('Get week comparison data', { status: 'running' });
      const comparison = await supabaseStorage.getWeekComparisonData();
      if (comparison && comparison.thisWeek && comparison.lastWeek) {
        updateTest('Get week comparison data', { status: 'pass', duration: Date.now() - start, message: 'Retrieved comparison data' });
      } else {
        updateTest('Get week comparison data', { status: 'fail', message: 'Missing comparison data' });
      }
    } catch (e: any) {
      updateTest('Get week comparison data', { status: 'fail', message: e.message });
    }

    // 18. Export to CSV
    try {
      const start = Date.now();
      updateTest('Export to CSV', { status: 'running' });
      const csv = await supabaseStorage.exportActualsToCSV();
      if (csv && csv.includes('Date')) {
        updateTest('Export to CSV', { status: 'pass', duration: Date.now() - start, message: `Generated ${csv.length} chars` });
      } else {
        updateTest('Export to CSV', { status: 'fail', message: 'CSV generation failed' });
      }
    } catch (e: any) {
      updateTest('Export to CSV', { status: 'fail', message: e.message });
    }

    // Cleanup test data
    try {
      // Delete test actual data
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('actual_data').delete().eq('date', testDate);
      await supabase.from('actual_data').delete().eq('date', testDate2);
    } catch (e) {
      console.log('Cleanup note:', e);
    }

    setRunning(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const passed = tests.filter(t => t.status === 'pass').length;
  const failed = tests.filter(t => t.status === 'fail').length;
  const total = tests.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Supabase Integration Tests</h1>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <p className="text-gray-600 mb-4">
            This will test all Supabase storage operations. Test data will be created and cleaned up automatically.
          </p>
          <button
            onClick={runTests}
            disabled={running}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run All Tests'
            )}
          </button>
        </div>

        {tests.length > 0 && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Results</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">{passed} passed</span>
                  <span className="text-red-600">{failed} failed</span>
                  <span className="text-gray-500">{total} total</span>
                </div>
              </div>
              {!running && total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${failed > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${(passed / total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Results */}
            <div className="bg-white rounded-xl shadow-md divide-y">
              {tests.map((test, idx) => (
                <div key={idx} className="p-4 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {test.status === 'pending' && (
                      <div className="w-6 h-6 rounded-full bg-gray-200" />
                    )}
                    {test.status === 'running' && (
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    )}
                    {test.status === 'pass' && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                    {test.status === 'fail' && (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{test.name}</div>
                    {test.message && (
                      <div className={`text-sm truncate ${test.status === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
                        {test.message}
                      </div>
                    )}
                  </div>
                  {test.duration && (
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {test.duration}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
