"use client";

import { TrendingUp, Mail, Phone, Copyright } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-2">
        {/* Main Footer Content */}
        <div className="flex items-center justify-between my-2 ">
          {/* Brand Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  BizAnalyzer
                </h3>
                <p className="text-gray-300 text-sm">Business Intelligence Platform</p>
              </div>
            </div>
            
          </div>

          {/* Contact Information */}
          <div className="space-y-2 mb-2">
            <h4 className="text-lg  text-hite mb-4">Contact-Us</h4>
            <div className="space-y-3">
              <a 
                href="mailto:bzanalyzer@gmail.com" 
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="font-medium">bzanalyzer@gmail.com</p>
                </div>
              </a>
              
              <a 
                href="tel:+919590126372" 
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <Phone className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="font-medium">+91 9590126372</p>
                </div>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-2">
          <div className="flex flex-col md:flex-row items-center justify-center ">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Copyright className="w-4 h-4" />
              <span>{currentYear} BizAnalyzer. All rights reserved.</span>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}