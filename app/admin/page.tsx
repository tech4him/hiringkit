"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  Eye, 
  User, 
  DollarSign,
  FileText,
  Calendar
} from "lucide-react";

// TypeScript interfaces for admin data
interface AdminKit {
  title: string;
}

interface AdminOrder {
  id: string;
  kit_id: string;
  user_id: string;
  status: "draft" | "awaiting_payment" | "paid" | "qa_pending" | "ready" | "delivered";
  total_cents: number;
  created_at: string;
  kits?: AdminKit;
}

type FilterStatus = "all" | "qa_pending" | "paid";

export default function AdminPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("qa_pending");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/orders?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleApproveKit = async (kitId: string) => {
    try {
      const response = await fetch(`/api/admin/kits/${kitId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        // Refresh orders
        loadOrders();
        alert("Kit approved and ready for download!");
      } else {
        throw new Error("Failed to approve kit");
      }
    } catch (error) {
      console.error("Error approving kit:", error);
      alert("Failed to approve kit. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "qa_pending":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "ready":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case "paid":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><DollarSign className="h-3 w-3 mr-1" />Paid</Badge>;
      case "delivered":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanType = (totalCents: number) => {
    return totalCents >= 10000 ? "Pro" : "Solo";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage hiring kit orders and QA workflow</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={filter === "qa_pending" ? "default" : "secondary"}
                onClick={() => setFilter("qa_pending")}
                size="sm"
              >
                QA Queue
              </Button>
              <Button
                variant={filter === "paid" ? "default" : "secondary"}
                onClick={() => setFilter("paid")}
                size="sm"
              >
                Ready Kits
              </Button>
              <Button
                variant={filter === "all" ? "default" : "secondary"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                All Orders
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter((order) => order.status === "qa_pending").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ready</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter((order) => order.status === "ready").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${orders.reduce((sum, order) => sum + (order.total_cents / 100), 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Kits</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filter === "qa_pending" && "QA Queue"}
              {filter === "paid" && "Ready Kits"}
              {filter === "all" && "All Orders"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No orders found for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Kit</th>
                      <th className="text-left py-3 px-4">Plan</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Customer</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{order.kits?.title || "Hiring Kit"}</p>
                            <p className="text-sm text-gray-600">ID: {order.kit_id.slice(0, 8)}...</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">
                            {getPlanType(order.total_cents)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">User {order.user_id.slice(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">${(order.total_cents / 100).toFixed(0)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.open(`/kit/${order.kit_id}`, '_blank')}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {order.status === "qa_pending" && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveKit(order.kit_id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}