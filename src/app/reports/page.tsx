"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, LogOut, ArrowLeft, Calendar, FileText, Package, ShoppingCart, CreditCard, AlertTriangle, Zap, Crown, IndianRupee, Smartphone } from "lucide-react";
import { getUserCollection } from "@/lib/dbHelper";

interface PaymentModeData {
  mode: string;
  amount: number;
  transactions: number;
  percentage: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [topProductsCount, setTopProductsCount] = useState(5);
  const [topExpensesCount, setTopExpensesCount] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Initialize dates to current month by default
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Fetch sales, expenses, and stocks
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [salesSnap, expensesSnap, stocksSnap] = await Promise.all([
          getDocs(query(await getUserCollection("sales"), orderBy("timestamp", "desc"))),
          getDocs(query(await getUserCollection("expenses"), orderBy("timestamp", "desc"))),
          getDocs(query(await getUserCollection("stocks"), orderBy("timestamp", "desc")))
        ]);

        const salesData = salesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
        }));
        
        const expensesData = expensesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
        }));

        const stocksData = stocksSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
        }));

        setSales(salesData);
        setExpenses(expensesData);
        setStocks(stocksData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter by custom date range
  const filterByDateRange = (items: any[]) => {
    if (!fromDate || !toDate) return items;
    
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    
    return items.filter((item) => {
      const date = item.timestamp;
      return date >= from && date <= to;
    });
  };

  // Quick date range presets
  const setDatePreset = (preset: string) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    switch (preset) {
      case "today":
        from = to = now;
        break;
      case "week":
        from = new Date(now.setDate(now.getDate() - 7));
        to = new Date();
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setFromDate(from.toISOString().split('T')[0]);
    setToDate(to.toISOString().split('T')[0]);
  };

  // Calculate filtered data
  const filteredSales = filterByDateRange(sales);
  const filteredExpenses = filterByDateRange(expenses);
  const filteredStocks = filterByDateRange(stocks);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.quantity * s.soldPrice), 0);
  const totalCostOfGoods = filteredSales.reduce((sum, s) => sum + (s.quantity * s.actualPrice), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalProfit - totalExpenses;

  // Stock value calculation
  const totalStockValue = stocks.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  // Category breakdowns
  const salesByCategory = filteredSales.reduce((acc, sale) => {
    acc[sale.product] = (acc[sale.product] || 0) + (sale.quantity * sale.soldPrice);
    return acc;
  }, {} as Record<string, number>);

  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // NEW: Payment Mode Breakdown
  const paymentModeData = filteredSales.reduce((acc, sale) => {
    const mode = sale.paymentMode || 'Other';
    const amount = sale.quantity * sale.soldPrice;
    
    if (!acc[mode]) {
      acc[mode] = { amount: 0, transactions: 0 };
    }
    
    acc[mode].amount += amount;
    acc[mode].transactions += 1;
    
    return acc;
  }, {} as Record<string, { amount: number; transactions: number }>);

  const paymentModeBreakdown: PaymentModeData[] = Object.entries(paymentModeData as any).map(([mode, data]: [string, any]) => ({
    mode,
    amount: data.amount,
    transactions: data.transactions,
    percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);

  // NEW: Best Selling Days (Top 3)
  const bestSellingDays = filteredSales.reduce((acc, sale) => {
    const date = sale.timestamp.toDateString();
    const revenue = sale.quantity * sale.soldPrice;
    acc[date] = (acc[date] || 0) + revenue;
    return acc;
  }, {} as Record<string, number>);

  const topSellingDays = Object.entries(bestSellingDays)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      amount
    }));

  // NEW: Most Profitable Products
  const productProfitability = filteredSales.reduce((acc, sale) => {
    const profit = sale.profit || 0;
    const revenue = sale.quantity * sale.soldPrice;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    if (!acc[sale.product] || margin > acc[sale.product].margin) {
      acc[sale.product] = { margin, profit };
    }
    return acc;
  }, {} as Record<string, { margin: number; profit: number }>);

  const mostProfitableProducts = Object.entries(productProfitability as [string, any][])
    .sort(([,a], [,b]) => (b as any).margin - (a as any).margin)
    .slice(0, 3)
    .map(([product, data]) => ({
      product,
      margin: (data as any).margin,
      profit: (data as any).profit
    }));

  // NEW: Low Stock Alerts
  const lowStockItems = stocks.filter(item => item.quantity < 10)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  // NEW: Fast Moving Items
  const productSalesCount = filteredSales.reduce((acc, sale) => {
    acc[sale.product] = (acc[sale.product] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fastMovingItems = Object.entries(productSalesCount)
    .filter(([, count]) => (count as number) >= 5)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([product, count]) => ({ product, count }));

  const getFilterLabel = () => {
    if (!fromDate || !toDate) return "Select Date Range";
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return `${from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${to.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'cash': return <IndianRupee className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'upi': return <Smartphone className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        {/* Navbar */}
        <nav className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
                  <p className="text-sm text-gray-600">Comprehensive business analytics and insights</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Date Range Selector */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Select Date Range
              </h3>
              <span className="text-sm text-gray-600 bg-purple-50 px-3 py-1 rounded-full">
                {getFilterLabel()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Inputs */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Quick Presets</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button 
                    onClick={() => setDatePreset("today")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => setDatePreset("week")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    This Week
                  </button>
                  <button 
                    onClick={() => setDatePreset("month")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    This Month
                  </button>
                  <button 
                    onClick={() => setDatePreset("year")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    This Year
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Performance Overview
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{filteredSales.length}</div>
                <div className="text-sm text-blue-700 mt-1">Sales Transactions</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="text-2xl font-bold text-red-600">{filteredExpenses.length}</div>
                <div className="text-sm text-red-700 mt-1">Expense Records</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{stocks.length}</div>
                <div className="text-sm text-green-700 mt-1">Stock Items</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className={`text-2xl font-bold ${totalRevenue > 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                  {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-purple-700 mt-1">Profit Margin</div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600 mt-2">₹{totalExpenses.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Profit</p>
                      <p className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ₹{netProfit.toLocaleString()}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                      <DollarSign className={`w-6 h-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Stock Value</p>
                      <p className="text-2xl font-bold text-purple-600 mt-2">
                        ₹{totalStockValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <PieChart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW: Payment Mode Breakdown */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Payment Mode Breakdown
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {paymentModeBreakdown.map((payment, index) => (
                      <div key={payment.mode} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            {getPaymentIcon(payment.mode)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 capitalize">{payment.mode}</div>
                            <div className="text-sm text-gray-500">{payment.transactions} transactions</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">₹{payment.amount.toLocaleString()}</div>
                          <div className="text-sm text-blue-600">{payment.percentage.toFixed(1)}% of total</div>
                        </div>
                      </div>
                    ))}
                    {paymentModeBreakdown.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No payment data for this period</p>
                    )}
                  </div>
                </div>
              </div>

              {/* NEW: Business Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Best Selling Days */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      Best Selling Days
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {topSellingDays.map((day:any, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{day.date}</div>
                            </div>
                          </div>
                          <span className="font-semibold text-green-600">₹{day.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {topSellingDays.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No sales data for this period</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Most Profitable Products */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Most Profitable Products
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {mostProfitableProducts.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{item.product}</div>
                              <div className="text-xs text-gray-500">₹{item.profit.toLocaleString()} profit</div>
                            </div>
                          </div>
                          <span className="font-semibold text-green-600">{item.margin.toFixed(1)}%</span>
                        </div>
                      ))}
                      {mostProfitableProducts.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No profitability data</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW: Alerts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Low Stock Alerts */}
                <div className="bg-white rounded-2xl shadow-lg border border-red-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Low Stock Alerts
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {lowStockItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <div>
                              <div className="font-medium text-gray-900">{item.product}</div>
                              <div className="text-xs text-red-600">Only {item.quantity} {item.unit} left</div>
                            </div>
                          </div>
                          <span className="font-semibold text-red-600">Restock Needed</span>
                        </div>
                      ))}
                      {lowStockItems.length === 0 && (
                        <p className="text-gray-500 text-center py-4">All items are well stocked</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fast Moving Items */}
                <div className="bg-white rounded-2xl shadow-lg border border-blue-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      Fast Moving Items
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {fastMovingItems.map((item:any, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="font-medium text-gray-900">{item.product}</div>
                              <div className="text-xs text-blue-600">{item.count} sales</div>
                            </div>
                          </div>
                          <span className="font-semibold text-blue-600">Popular</span>
                        </div>
                      ))}
                      {fastMovingItems.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No fast moving items</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                        Top Products by Revenue
                      </h3>
                      <select
                        value={topProductsCount}
                        onChange={(e) => setTopProductsCount(Number(e.target.value))}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                      >
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-3">
                      {Object.entries(salesByCategory)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, topProductsCount)
                        .map(([product, amount], index) => (
                          <div key={product} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-gray-900">{product}</span>
                            </div>
                            <span className="font-semibold text-green-600">₹{(amount as number).toLocaleString()}</span>
                          </div>
                        ))
                      }
                      {Object.keys(salesByCategory).length === 0 && (
                        <p className="text-gray-500 text-center py-4">No sales data for this period</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Expenses */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-red-600" />
                        Top Expenses by Category
                      </h3>
                      <select
                        value={topExpensesCount}
                        onChange={(e) => setTopExpensesCount(Number(e.target.value))}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                      >
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-3">
                      {Object.entries(expensesByCategory)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, topExpensesCount)
                        .map(([category, amount], index) => (
                          <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium text-gray-900">{category}</span>
                            </div>
                            <span className="font-semibold text-red-600">₹{(amount as number).toLocaleString()}</span>
                          </div>
                        ))
                      }
                      {Object.keys(expensesByCategory).length === 0 && (
                        <p className="text-gray-500 text-center py-4">No expense data for this period</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}