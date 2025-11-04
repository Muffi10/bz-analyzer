"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, LogOut, ArrowLeft, Calendar, FileText } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [filter, setFilter] = useState<"daily" | "monthly" | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Fetch sales, expenses, and stocks
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [salesSnap, expensesSnap, stocksSnap] = await Promise.all([
          getDocs(query(collection(db, "sales"), orderBy("timestamp", "desc"))),
          getDocs(query(collection(db, "expenses"), orderBy("timestamp", "desc"))),
          getDocs(query(collection(db, "stocks"), orderBy("timestamp", "desc")))
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

  // Helper function to filter by date range
  const filterByDate = (items: any[]) => {
    const now = new Date();
    return items.filter((item) => {
      const date = item.timestamp;

      if (filter === "daily")
        return date.toDateString() === now.toDateString();

      if (filter === "monthly")
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );

      return true; // all
    });
  };

  // Calculate totals
  const filteredSales = filterByDate(sales);
  const filteredExpenses = filterByDate(expenses);
  const filteredStocks = filterByDate(stocks);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.quantity * s.soldPrice), 0);
  const totalCostOfGoods = filteredSales.reduce((sum, s) => sum + (s.quantity * s.actualPrice), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalProfit - totalExpenses;

  // Stock value calculation
  const totalStockValue = stocks.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  const filteredStockValue = filteredStocks.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

  // Category breakdowns
  const salesByCategory = filteredSales.reduce((acc, sale) => {
    acc[sale.product] = (acc[sale.product] || 0) + (sale.quantity * sale.soldPrice);
    return acc;
  }, {} as Record<string, number>);

  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const getFilterLabel = () => {
    const now = new Date();
    if (filter === "daily") return `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    if (filter === "monthly") return `This Month (${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
    return "All Time";
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
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Header with Filter */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
              <p className="text-gray-600 mt-1">{getFilterLabel()}</p>
            </div>
            
            <div className="flex gap-2 bg-white rounded-xl shadow-lg p-2 border border-gray-200">
              {["daily", "monthly", "all"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    filter === f
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Calendar size={16} />
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
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
                        ₹{filter === "all" ? totalStockValue.toLocaleString() : filteredStockValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <PieChart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Detailed Analytics */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Performance Metrics
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Sales Transactions</span>
                      <span className="font-semibold text-gray-900">{filteredSales.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Expense Records</span>
                      <span className="font-semibold text-gray-900">{filteredExpenses.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Profit Margin</span>
                      <span className={`font-semibold ${totalRevenue > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Cost of Goods</span>
                      <span className="font-semibold text-orange-600">₹{totalCostOfGoods.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Top Categories
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Top Selling Products</h4>
                      {Object.entries(salesByCategory)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([product, amount]) => (
                          <div key={product} className="flex justify-between items-center p-2">
                            <span className="text-sm text-gray-600 truncate">{product}</span>
                            <span className="text-sm font-semibold text-green-600">₹{amount.toLocaleString()}</span>
                          </div>
                        ))
                      }
                      {Object.keys(salesByCategory).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No sales data</p>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Top Expense Categories</h4>
                      {Object.entries(expensesByCategory)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 3)
                        .map(([category, amount]) => (
                          <div key={category} className="flex justify-between items-center p-2">
                            <span className="text-sm text-gray-600">{category}</span>
                            <span className="text-sm font-semibold text-red-600">₹{amount.toLocaleString()}</span>
                          </div>
                        ))
                      }
                      {Object.keys(expensesByCategory).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No expense data</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Business Overview
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">{sales.length}</div>
                    <div className="text-sm text-blue-700 mt-1">Total Sales</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-2xl font-bold text-red-600">{expenses.length}</div>
                    <div className="text-sm text-red-700 mt-1">Total Expenses</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">{stocks.length}</div>
                    <div className="text-sm text-green-700 mt-1">Stock Items</div>
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