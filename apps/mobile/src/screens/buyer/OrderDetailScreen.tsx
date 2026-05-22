import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';

import {
  fetchOrderDetail,
  cancelOrder,
  submitReturnExchange,
  type OrderRecord,
  type OrderItem,
} from '../../api/order.api';

type OrderDetailRouteProp = RouteProp<{ OrderDetail: { orderId: string } }, 'OrderDetail'>;

const STATUS_COLORS: Record<OrderRecord['orderStatus'], { bg: string; text: string }> = {
  Confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Processing: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Shipped: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Delivered: { bg: 'bg-green-100', text: 'text-green-700' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

const PAYMENT_STATUS_COLORS: Record<OrderRecord['paymentStatus'], { bg: string; text: string }> = {
  Paid: { bg: 'bg-green-100', text: 'text-green-700' },
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Refunded: { bg: 'bg-blue-100', text: 'text-blue-700' },
  RefundPending: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

function StatusBadge({
  label,
  colors,
}: {
  label: string;
  colors: { bg: string; text: string };
}): React.JSX.Element {
  return (
    <View className={`${colors.bg} rounded-full px-2.5 py-0.5`}>
      <Text className={`text-xs font-medium ${colors.text}`}>{label}</Text>
    </View>
  );
}

function OrderItemRow({ item }: { item: OrderItem }): React.JSX.Element {
  return (
    <View
      className="flex-row justify-between py-3 border-b border-gray-50"
      accessibilityLabel={`${item.name}, quantity ${String(item.quantity)}, subtotal ${String(item.subtotal)} rupees`}
    >
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-gray-900" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          Qty: {item.quantity} × ₹{item.priceAtPurchase.toLocaleString()}
        </Text>
      </View>
      <Text className="text-sm font-semibold text-gray-900">₹{item.subtotal.toFixed(2)}</Text>
    </View>
  );
}

function ReturnExchangeModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (type: 'Return' | 'Exchange') => void;
  isSubmitting: boolean;
}): React.JSX.Element {
  const [selectedType, setSelectedType] = useState<'Return' | 'Exchange'>('Return');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-2xl p-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Return or Exchange</Text>
          <Text className="text-sm text-gray-600 mb-4">
            Select the type of request you would like to submit:
          </Text>

          <TouchableOpacity
            className={`rounded-lg p-4 mb-3 border ${
              selectedType === 'Return'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 bg-white'
            }`}
            onPress={() => {
              setSelectedType('Return');
            }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedType === 'Return' }}
            accessibilityLabel="Return - Get a refund for your order"
          >
            <View className="flex-row items-center">
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                  selectedType === 'Return' ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {selectedType === 'Return' && (
                  <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                )}
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-900">Return</Text>
                <Text className="text-xs text-gray-500">Get a refund for your order</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-lg p-4 mb-6 border ${
              selectedType === 'Exchange'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 bg-white'
            }`}
            onPress={() => {
              setSelectedType('Exchange');
            }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedType === 'Exchange' }}
            accessibilityLabel="Exchange - Replace with a different item"
          >
            <View className="flex-row items-center">
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                  selectedType === 'Exchange' ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {selectedType === 'Exchange' && (
                  <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                )}
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-900">Exchange</Text>
                <Text className="text-xs text-gray-500">Replace with a different item</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 mr-2 border border-gray-300 rounded-lg py-3 items-center"
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-sm font-medium text-gray-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 ml-2 rounded-lg py-3 items-center ${
                isSubmitting ? 'bg-gray-300' : 'bg-indigo-600'
              }`}
              onPress={() => {
                onSubmit(selectedType);
              }}
              disabled={isSubmitting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Submit ${selectedType} request`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-medium text-white">Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function OrderDetailScreen(): React.JSX.Element {
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const [showReturnModal, setShowReturnModal] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrderDetail(orderId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['order', orderId], updatedOrder);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      const refundMessage =
        updatedOrder.refundStatus === 'Completed'
          ? 'Your refund has been processed.'
          : updatedOrder.refundStatus === 'Pending'
            ? 'Your refund is being processed and will be completed shortly.'
            : 'Order cancelled successfully.';
      Alert.alert('Order Cancelled', refundMessage);
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to cancel order. Please try again.';
      Alert.alert('Cancellation Failed', message);
    },
  });

  const returnExchangeMutation = useMutation({
    mutationFn: (type: 'Return' | 'Exchange') => submitReturnExchange(orderId, type),
    onSuccess: (request) => {
      setShowReturnModal(false);
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert(
        `${request.type} Request Submitted`,
        `Your ${request.type.toLowerCase()} request #${request.requestId.slice(0, 8)} has been submitted and is pending review.`,
      );
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to submit request. Please try again.';
      Alert.alert('Request Failed', message);
    },
  });

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => {
          cancelMutation.mutate();
        },
      },
    ]);
  }, [cancelMutation]);

  const handleReturnExchangeSubmit = useCallback(
    (type: 'Return' | 'Exchange') => {
      returnExchangeMutation.mutate(type);
    },
    [returnExchangeMutation],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-gray-500">Loading order details...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Failed to load order</Text>
        <Text className="mt-2 text-gray-500 text-center">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-indigo-600 px-6 py-3 rounded-lg"
          onPress={() => {
            void refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading order"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-lg font-semibold text-gray-700">Order not found</Text>
      </View>
    );
  }

  const canCancel = order.orderStatus === 'Confirmed' || order.orderStatus === 'Processing';
  const canReturnExchange = order.orderStatus === 'Delivered';
  const formattedDate = new Date(order.orderTimestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Order Header */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-100">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-bold text-gray-900">
              Order #{order.orderId.slice(0, 8).toUpperCase()}
            </Text>
            <StatusBadge label={order.orderStatus} colors={STATUS_COLORS[order.orderStatus]} />
          </View>
          <Text className="text-sm text-gray-500">{formattedDate}</Text>
        </View>

        {/* Order Items */}
        <View className="bg-white mx-4 mt-3 rounded-xl p-4 border border-gray-100">
          <Text className="text-sm font-bold text-gray-900 mb-2">Items</Text>
          {order.items.map((item) => (
            <OrderItemRow key={item.productId} item={item} />
          ))}
          <View className="flex-row justify-between pt-3 mt-1">
            <Text className="text-base font-bold text-gray-900">Total</Text>
            <Text className="text-base font-bold text-indigo-600">
              ₹{order.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View className="bg-white mx-4 mt-3 rounded-xl p-4 border border-gray-100">
          <Text className="text-sm font-bold text-gray-900 mb-2">Delivery Address</Text>
          <Text className="text-sm font-medium text-gray-800">
            {order.deliveryAddressSnapshot.fullName}
          </Text>
          <Text className="text-sm text-gray-600 mt-0.5">
            {order.deliveryAddressSnapshot.line1}
            {order.deliveryAddressSnapshot.line2 ? `, ${order.deliveryAddressSnapshot.line2}` : ''}
          </Text>
          <Text className="text-sm text-gray-600">
            {order.deliveryAddressSnapshot.city}, {order.deliveryAddressSnapshot.state}{' '}
            {order.deliveryAddressSnapshot.postalCode}
          </Text>
          <Text className="text-sm text-gray-600">{order.deliveryAddressSnapshot.country}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Phone: {order.deliveryAddressSnapshot.phone}
          </Text>
        </View>

        {/* Payment Info */}
        <View className="bg-white mx-4 mt-3 rounded-xl p-4 border border-gray-100">
          <Text className="text-sm font-bold text-gray-900 mb-2">Payment</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">Method</Text>
            <Text className="text-sm font-medium text-gray-900">{order.paymentMethod}</Text>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-sm text-gray-600">Payment Status</Text>
            <StatusBadge
              label={order.paymentStatus}
              colors={PAYMENT_STATUS_COLORS[order.paymentStatus]}
            />
          </View>
          {order.transactionId && (
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-sm text-gray-600">Transaction ID</Text>
              <Text className="text-xs font-mono text-gray-500">
                {order.transactionId.slice(0, 12)}...
              </Text>
            </View>
          )}
          {order.refundStatus && (
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-sm text-gray-600">Refund Status</Text>
              <StatusBadge
                label={order.refundStatus}
                colors={
                  order.refundStatus === 'Completed'
                    ? { bg: 'bg-green-100', text: 'text-green-700' }
                    : { bg: 'bg-orange-100', text: 'text-orange-700' }
                }
              />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {(canCancel || canReturnExchange) && (
          <View className="mx-4 mt-4">
            {canCancel && (
              <TouchableOpacity
                className={`rounded-lg py-3.5 items-center border ${
                  cancelMutation.isPending
                    ? 'border-gray-200 bg-gray-100'
                    : 'border-red-300 bg-red-50'
                }`}
                onPress={handleCancel}
                disabled={cancelMutation.isPending}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel this order"
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Text className="text-sm font-semibold text-red-600">Cancel Order</Text>
                )}
              </TouchableOpacity>
            )}
            {canReturnExchange && (
              <TouchableOpacity
                className="rounded-lg py-3.5 items-center border border-indigo-300 bg-indigo-50 mt-3"
                onPress={() => {
                  setShowReturnModal(true);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Request return or exchange"
              >
                <Text className="text-sm font-semibold text-indigo-600">Return / Exchange</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <ReturnExchangeModal
        visible={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
        }}
        onSubmit={handleReturnExchangeSubmit}
        isSubmitting={returnExchangeMutation.isPending}
      />
    </View>
  );
}
