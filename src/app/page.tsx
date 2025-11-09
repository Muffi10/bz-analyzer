//src/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ArrowRight, TrendingUp, ShoppingCart, DollarSign, BarChart3 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const pages = [
    { 
      name: "Stocks", 
      path: "/stocks", 
      icon: TrendingUp,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50"
    },
    { 
      name: "Sales", 
      path: "/sales", 
      icon: ShoppingCart,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50"
    },
    { 
      name: "Expenses", 
      path: "/expenses", 
      icon: DollarSign,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50"
    },
    { 
      name: "Reports", 
      path: "/reports", 
      icon: BarChart3,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50"
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Business Dashboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage your inventory, track sales, monitor expenses, and generate comprehensive reports
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {pages.map((page) => {
              const IconComponent = page.icon;
              return (
                <div
                  key={page.name}
                  onClick={() => router.push(page.path)}
                  className="group cursor-pointer bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center border border-gray-100 hover:scale-105 hover:-translate-y-2"
                >
                  {/* Icon Container */}
                  <div className={`${page.bgColor} rounded-2xl p-6 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${page.color} flex items-center justify-center shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {page.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        View and manage {page.name.toLowerCase()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full bg-gradient-to-r ${page.color} group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats Section (Optional) */}
          <div className="mt-20 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 max-w-4xl mx-auto border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Quick Overview
              </h2>
              <p className="text-gray-600">
                Get started by exploring any of the modules above to manage your business operations efficiently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}