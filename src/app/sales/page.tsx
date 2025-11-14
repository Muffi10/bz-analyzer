"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, orderBy, query, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Plus, Trash2, TrendingUp, LogOut, ArrowLeft, IndianRupee, Users, CreditCard, Smartphone, Search, Calendar, Package, RotateCcw } from "lucide-react";
import { getUserCollection } from "@/lib/dbHelper";

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [customer, setCustomer] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [stockWarningData, setStockWarningData] = useState({ product: "", available: 0, requested: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "year">("all");
  const [isFetching, setIsFetching] = useState(true);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter sales based on time filter
  useEffect(() => {
    if (timeFilter === "all") {
      setFilteredSales(sales);
      return;
    }

    const now = new Date();
    let filtered = [];

    switch (timeFilter) {
      case "today":
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = sales.filter(sale => {
          const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp);
          return saleDate >= todayStart;
        });
        break;
      
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        filtered = sales.filter(sale => {
          const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp);
          return saleDate >= weekStart;
        });
        break;
      
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        filtered = sales.filter(sale => {
          const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp);
          return saleDate >= yearStart;
        });
        break;
      
      default:
        filtered = sales;
    }

    setFilteredSales(filtered);
  }, [timeFilter, sales]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Fetch stocks for search functionality
  const fetchStocks = async () => {
    try {
      const q = query( await getUserCollection("stocks"), orderBy("product", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data()
      }));
      setStocks(data);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    }
  };

  // Search products with debouncing
  const handleProductSearch = (searchTerm: string) => {
    setProduct(searchTerm);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedStock(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const filtered = stocks.filter(stock =>
        stock.product.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    }, 300);
  };

  // Select product from dropdown
  const handleSelectProduct = (stock: any) => {
    setProduct(stock.product);
    setActualPrice(stock.costPrice.toString());
    setSelectedStock(stock);
    setShowDropdown(false);
  };

  // Check stock availability before sale
  const checkStockAvailability = () => {
    if (!selectedStock || !quantity) return true;

    const requestedQty = parseFloat(quantity);
    const availableQty = selectedStock.quantity;

    if (requestedQty > availableQty) {
      setStockWarningData({
        product: selectedStock.product,
        available: availableQty,
        requested: requestedQty
      });
      setShowStockWarning(true);
      return false;
    }
    return true;
  };

  // Update stock quantity after sale
  const updateStockQuantity = async (stockId: string, soldQuantity: number) => {
    try {
      const stockRef = doc(db, `users/${auth.currentUser?.uid}/stocks`, stockId);
      const stock = stocks.find(s => s.id === stockId);
      
      if (stock) {
        const newQuantity = stock.quantity - soldQuantity;
        await updateDoc(stockRef, {
          quantity: newQuantity
        });
        // Refresh stocks data
        fetchStocks();
      }
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  // Add stock quantity back when sale is deleted
  const restoreStockQuantity = async (productName: string, quantityToRestore: number) => {
    try {
      // Find the stock item by product name
      const stockItem = stocks.find(stock => 
        stock.product.toLowerCase() === productName.toLowerCase()
      );
      
      if (stockItem) {
        const stockRef = doc(db, `users/${auth.currentUser?.uid}/stocks`, stockItem.id);
        const newQuantity = stockItem.quantity + quantityToRestore;
        await updateDoc(stockRef, {
          quantity: newQuantity
        });
        // Refresh stocks data
        fetchStocks();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error restoring stock:", error);
      return false;
    }
  };

  // Add sale record
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !quantity || !actualPrice || !soldPrice) return;

    // Check stock availability
    if (!checkStockAvailability()) {
      return;
    }

    setIsLoading(true);
    const profit = (parseFloat(soldPrice) - parseFloat(actualPrice)) * parseFloat(quantity);

    try {
      // Create timestamp from selected date
      const saleTimestamp = new Date(saleDate);
      saleTimestamp.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());

      await addDoc(await getUserCollection("sales"), {
        product: product.trim(),
        quantity: parseFloat(quantity),
        actualPrice: parseFloat(actualPrice),
        soldPrice: parseFloat(soldPrice),
        paymentMode,
        customer: customer.trim() || "Walk-in Customer",
        profit,
        timestamp: saleTimestamp,
      });

      // Update stock quantity if product is from stock
      if (selectedStock) {
        await updateStockQuantity(selectedStock.id, parseFloat(quantity));
      }

      // Reset form
      setProduct("");
      setQuantity("");
      setActualPrice("");
      setSoldPrice("");
      setCustomer("");
      setSelectedStock(null);
      setSaleDate(new Date().toISOString().split('T')[0]);
      fetchSales();
    } catch (error) {
      console.error("Error adding sale:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sale with insufficient stock
  const handleProceedWithSale = async () => {
    setShowStockWarning(false);
    setIsLoading(true);
    const profit = (parseFloat(soldPrice) - parseFloat(actualPrice)) * parseFloat(quantity);

    try {
      const saleTimestamp = new Date(saleDate);
      saleTimestamp.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());

      await addDoc(await getUserCollection("sales"), {
        product: product.trim(),
        quantity: parseFloat(quantity),
        actualPrice: parseFloat(actualPrice),
        soldPrice: parseFloat(soldPrice),
        paymentMode,
        customer: customer.trim() || "Walk-in Customer",
        profit,
        timestamp: saleTimestamp,
      });

      // Update stock to zero if selling more than available
      if (selectedStock) {
        const stockRef = doc(db, `users/${auth.currentUser?.uid}/stocks`, selectedStock.id);
        await updateDoc(stockRef, {
          quantity: 0
        });
        fetchStocks();
      }

      // Reset form
      setProduct("");
      setQuantity("");
      setActualPrice("");
      setSoldPrice("");
      setCustomer("");
      setSelectedStock(null);
      setSaleDate(new Date().toISOString().split('T')[0]);
      fetchSales();
    } catch (error) {
      console.error("Error adding sale:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete sale record with confirmation and stock restoration
  const handleDeleteSale = async (sale: any, restoreStock: boolean = false) => {
    try {
      // Check if product exists in stock and restore quantity if requested
      if (restoreStock) {
        const stockRestored = await restoreStockQuantity(sale.product, sale.quantity);
        if (stockRestored) {
          console.log(`Stock restored: ${sale.quantity} units of ${sale.product}`);
        }
      }

      await deleteDoc(doc(db, `users/${auth.currentUser?.uid}/sales`, sale.id));
      fetchSales();
      
      // Show success message
      if (restoreStock) {
        alert(`✅ Sale deleted and ${sale.quantity} units of ${sale.product} restored to stock.`);
      } else {
        alert("✅ Sale deleted successfully.");
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("❌ Failed to delete sale. Please try again.");
    } finally {
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = (sale: any) => {
    setSaleToDelete(sale);
    setShowDeleteConfirm(true);
  };

  // Fetch sales
  const fetchSales = async () => {
    try {
      setIsFetching(true);
      const q = query(await getUserCollection("sales"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => { 
        const docData = doc.data();
        let timestamp;
        
        // Handle Firestore timestamp conversion properly
        if (docData.timestamp && typeof docData.timestamp.toDate === 'function') {
          timestamp = docData.timestamp.toDate();
        } else if (docData.timestamp) {
          timestamp = new Date(docData.timestamp);
        } else {
          timestamp = new Date();
        }
        
        return { 
          id: doc.id, 
          ...docData,
          timestamp: timestamp
        };
      });
      console.log("Fetched sales:", data.length);
      setSales(data);
      setFilteredSales(data);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Check if product exists in stock
  const isProductInStock = (productName: string) => {
    return stocks.some(stock => 
      stock.product.toLowerCase() === productName.toLowerCase()
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSales();
    fetchStocks();
  }, []);

  // Calculate statistics based on filtered sales
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, item) => sum + (item.quantity * item.soldPrice), 0);
  const totalProfit = filteredSales.reduce((sum, item) => sum + item.profit, 0);
  const totalQuantity = filteredSales.reduce((sum, item) => sum + item.quantity, 0);

  const getPaymentIcon = (mode: string) => {
    switch (mode) {
      case "Cash": return <IndianRupee size={16} />;
      case "Card": return <CreditCard size={16} />;
      case "UPI": return <Smartphone size={16} />;
      default: return <IndianRupee size={16} />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
                  <p className="text-sm text-gray-600">Track your sales and profits</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Time Filter Buttons - Responsive */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base rounded-xl font-semibold transition-all duration-200 ${
                timeFilter === "all" 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Sales
            </button>
            <button
              onClick={() => setTimeFilter("today")}
              className={`px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base rounded-xl font-semibold transition-all duration-200 ${
                timeFilter === "today" 
                  ? "bg-green-600 text-white shadow-lg" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter("week")}
              className={`px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base rounded-xl font-semibold transition-all duration-200 ${
                timeFilter === "week" 
                  ? "bg-purple-600 text-white shadow-lg" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter("year")}
              className={`px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base rounded-xl font-semibold transition-all duration-200 ${
                timeFilter === "year" 
                  ? "bg-orange-600 text-white shadow-lg" 
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              This Year
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{isFetching ? "..." : totalSales}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">₹{isFetching ? "..." : totalRevenue.toFixed(2)}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Profit</p>
                  <p className={`text-xl sm:text-3xl font-bold mt-1 sm:mt-2 ${isFetching ? 'text-gray-900' : totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {isFetching ? "..." : `₹${totalProfit.toFixed(2)}`}
                  </p>
                </div>
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${isFetching ? 'bg-gray-100' : totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-4 h-4 sm:w-6 sm:h-6 ${isFetching ? 'text-gray-600' : totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Items Sold</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{isFetching ? "..." : totalQuantity}</p>
                </div>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Add Sale Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 sticky top-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  Record New Sale
                </h2>

                <form onSubmit={handleAddSale} className="space-y-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 bg-white text-sm sm:text-base"
                        required
                      />
                      <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Product Search with Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search or enter product name"
                          value={product}
                          onChange={(e) => handleProductSearch(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                          required
                        />
                        <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                      
                      {/* Search Dropdown */}
                      {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((stock) => (
                            <div
                              key={stock.id}
                              onClick={() => handleSelectProduct(stock)}
                              className="flex items-center justify-between p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div>
                                <div className="font-medium text-gray-900 text-sm sm:text-base">{stock.product}</div>
                                <div className="text-xs sm:text-sm text-gray-500">
                                  Available: {stock.quantity} {stock.unit} • ₹{stock.costPrice}/unit
                                </div>
                              </div>
                              <Package className="h-4 w-4 text-green-600" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Stock Info */}
                    {selectedStock && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-blue-700 font-medium">Stock Info:</span>
                          <span className="text-blue-600">
                            {selectedStock.quantity} {selectedStock.unit} available
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 bg-white text-sm sm:text-base"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost Price
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={actualPrice}
                        onChange={(e) => setActualPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Price
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={soldPrice}
                        onChange={(e) => setSoldPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Customer name or number"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 placeholder-gray-500 text-sm sm:text-base"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        Record Sale
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sales Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Sales History</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {isFetching ? "Loading..." : `${filteredSales.length} sales records ${timeFilter !== "all" ? `(${timeFilter})` : ''}`}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Product</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Qty</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Cost</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Sold</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Profit</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Payment</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {isFetching ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center">
                            <div className="flex justify-center">
                              <div className="w-8 h-8 border-t-2 border-green-600 border-solid rounded-full animate-spin"></div>
                            </div>
                            <p className="text-gray-500 mt-2">Loading sales...</p>
                          </td>
                        </tr>
                      ) : filteredSales.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 sm:px-6 py-3">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{item.product}</div>
                            <div className="text-xs text-gray-500 sm:hidden">{item.customer}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <div className="text-xs sm:text-sm text-gray-900">{item.quantity}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <div className="text-xs sm:text-sm text-gray-900">₹{item.actualPrice}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <div className="text-xs sm:text-sm font-medium text-green-600">₹{item.soldPrice}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <div className={`text-xs sm:text-sm font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{item.profit.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                              {getPaymentIcon(item.paymentMode)}
                              <span className="hidden sm:inline">{item.paymentMode}</span>
                              <span className="sm:hidden text-xs">{item.paymentMode.slice(0,1)}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <div className="text-xs sm:text-sm text-gray-500">
                              {item.timestamp.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                              <br />
                              <span className="text-xs hidden sm:inline">
                                {item.timestamp.toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <button
                              onClick={() => showDeleteConfirmation(item)}
                              className="p-1 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete sale record"
                            >
                              <Trash2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {!isFetching && filteredSales.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <p className="text-sm sm:text-lg text-gray-500">
                        {timeFilter === "all" ? "No sales records yet" : `No sales records for ${timeFilter}`}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        {timeFilter === "all" ? "Record your first sale to get started" : "Try changing the time filter"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Warning Modal */}
        {showStockWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Package className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Insufficient Stock</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Stock availability warning</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-red-800 text-xs sm:text-sm">
                  Only <strong>{stockWarningData.available}</strong> units of <strong>"{stockWarningData.product}"</strong> available in stock, but you're trying to sell <strong>{stockWarningData.requested}</strong> units.
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowStockWarning(false)}
                  className="flex-1 bg-gray-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedWithSale}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    "Proceed Anyway"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && saleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Delete Sale Record</h3>
                  <p className="text-xs sm:text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-gray-800 text-xs sm:text-sm mb-3">
                  Are you sure you want to delete the sale of <strong>{saleToDelete.quantity} units</strong> of <strong>"{saleToDelete.product}"</strong>?
                </p>
                
                {isProductInStock(saleToDelete.product) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      <span className="text-xs sm:text-sm font-medium text-blue-800">Stock Restoration Available</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      This product exists in your stock. Do you want to restore {saleToDelete.quantity} units back to stock when deleting this sale?
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSaleToDelete(null);
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200 text-sm sm:text-base"
                >
                  Cancel
                </button>
                
                {isProductInStock(saleToDelete.product) ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 flex-1">
                    <button
                      onClick={() => handleDeleteSale(saleToDelete, false)}
                      className="flex-1 bg-red-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 text-sm sm:text-base"
                    >
                      Delete Only
                    </button>
                    <button
                      onClick={() => handleDeleteSale(saleToDelete, true)}
                      className="flex-1 bg-green-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                    >
                      <RotateCcw size={14} className="sm:w-4 sm:h-4" />
                      Restore Stock
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDeleteSale(saleToDelete, false)}
                    className="flex-1 bg-red-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 text-sm sm:text-base"
                  >
                    Confirm Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}