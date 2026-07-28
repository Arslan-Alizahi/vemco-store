'use client'

import { motion } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Card from '@/components/ui/Card'
import { Truck, Package, Clock, MapPin, DollarSign, CheckCircle } from 'lucide-react'

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">Shipping Information</h1>
          <p className="text-lg sm:text-xl text-text-secondary">
            Fast, reliable shipping to your doorstep
          </p>
        </motion.div>

        {/* Shipping Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-6">Shipping Methods</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">City Delivery</h3>
              <p className="text-text-secondary mb-2">3-5 working days</p>
              <p className="text-h2 tabular-nums text-text-primary">Rs 2,500</p>
              <p className="text-sm text-text-tertiary mt-2">Free over Rs 100,000</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow border-2 border-caramel-500">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-caramel-100 rounded-full">
                  <Package className="h-8 w-8 text-caramel-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Room of Choice</h3>
              <p className="text-text-secondary mb-2">3-5 working days</p>
              <p className="text-h2 tabular-nums text-text-primary">Rs 4,500</p>
              <p className="text-sm text-text-tertiary mt-2">Carried in, unwrapped, packaging taken away</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Upcountry</h3>
              <p className="text-text-secondary mb-2">7-10 working days</p>
              <p className="text-h2 tabular-nums text-text-primary">Rs 7,500</p>
              <p className="text-sm text-text-tertiary mt-2">Outside Lahore, Karachi and Islamabad</p>
            </Card>
          </div>
        </motion.div>

        {/* Shipping Zones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <Card className="p-6 md:p-8">
            <div className="flex items-center mb-6">
              <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-caramel-600 mr-3" />
              <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Shipping Zones</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-success-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-text-primary">Lahore, Karachi and Islamabad</h3>
                  <p className="text-text-secondary">Our own delivery teams, with a room-of-choice option and a two-hour arrival window on the day.</p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-success-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-text-primary">Rest of Punjab and Sindh</h3>
                  <p className="text-text-secondary">Rawalpindi, Faisalabad, Multan, Hyderabad, Sialkot and Gujranwala on a weekly run.</p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-success-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-text-primary">KP, Balochistan and AJK</h3>
                  <p className="text-text-secondary">Delivered through a freight partner. Larger pieces are crated; we call to confirm access before dispatch.</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Processing Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Card className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-caramel-50">
            <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-4">Processing Time</h2>
            <p className="text-text-secondary mb-4">
              Orders are typically processed within 1-2 business days. You'll receive a confirmation email with tracking information once your order ships.
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li>Orders placed before 3 PM PKT are picked the same day</li>
              <li>Orders placed after 3 PM PKT are picked the next working day</li>
              <li>Friday afternoon and Sunday orders are picked on Monday</li>
              <li>Made-to-order pieces take 3 to 4 weeks before dispatch</li>
            </ul>
          </Card>
        </motion.div>

        {/* Free Shipping */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <Card className="p-6 md:p-8 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center mb-4">
              <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 mr-3" />
              <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Free Shipping</h2>
            </div>
            <p className="text-text-secondary text-base sm:text-lg">
              <strong>Free city delivery on orders over Rs 100,000.</strong>
            </p>
            <p className="text-text-secondary mt-2">
              No code needed. Discount applied automatically at checkout.
            </p>
          </Card>
        </motion.div>

        {/* Tracking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-text-primary mb-4">Order Tracking</h2>
            <p className="text-text-secondary mb-4">
              Once your order ships, you'll receive an email with a tracking number. You can use this to monitor your package's journey to your doorstep.
            </p>
            <div className="space-y-3 text-text-secondary">
              <p><strong>Track your order:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Click the tracking link in your shipping confirmation email</li>
                <li>Visit the carrier's website and enter your tracking number</li>
                <li>Check your order status in your account dashboard</li>
              </ul>
            </div>
          </Card>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-text-secondary mb-4">
            Have questions about shipping? We're here to help!
          </p>
          <a href="/contact" className="text-caramel-600 hover:text-caramel-700 font-semibold underline">
            Contact Our Support Team
          </a>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
