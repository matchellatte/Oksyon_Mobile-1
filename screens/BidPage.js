import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

const BidPage = ({ route, navigation }) => {
  const { item, userId, ownerId } = route.params || {};
  const [bidAmount, setBidAmount] = useState('');
  const [currentHighestBid, setCurrentHighestBid] = useState(item?.starting_price || 0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInitialBidData = async () => {
      try {
        // Fetch the highest bid
        const { data: highestBidData, error: highestBidError } = await supabase
          .from('bids')
          .select('bid_amount')
          .eq('livestock_id', item.livestock_id)
          .order('bid_amount', { ascending: false })
          .limit(1);

        if (highestBidError) throw highestBidError;
        if (highestBidData.length > 0) {
          setCurrentHighestBid(highestBidData[0].bid_amount);
        }

        // Fetch the unique user count for bidders on this item
        const { count, error: userCountError } = await supabase
          .from('bids')
          .select('bidder_id', { count: 'exact', distinct: true })
          .eq('livestock_id', item.livestock_id);

        if (userCountError) throw userCountError;
        setUserCount(count);
      } catch (error) {
        console.error('Error fetching initial bid data:', error);
      }
    };

    fetchInitialBidData();
  }, [item.livestock_id]);

  const handlePlaceBid = async () => {
    if (!item) {
      Alert.alert('Error', 'Invalid auction item.');
      navigation.goBack();
      return;
    }

    if (userId === ownerId) {
      Alert.alert('Error', 'You cannot place a bid on your own auction.');
      return;
    }

    const parsedBidAmount = parseFloat(bidAmount);
    if (isNaN(parsedBidAmount)) {
      Alert.alert('Invalid Bid', 'Please enter a valid bid amount.');
      return;
    }

    if (parsedBidAmount <= currentHighestBid) {
      Alert.alert(
        'Invalid Bid',
        `Your bid must be higher than the current highest bid of ₱${currentHighestBid.toLocaleString()}.`
      );
      return;
    }

    setLoading(true);

    try {
      const { error: bidError } = await supabase.from('bids').insert([
        {
          livestock_id: item.livestock_id,
          bidder_id: userId,
          bid_amount: parsedBidAmount,
          status: 'pending',
        },
      ]);

      if (bidError) throw bidError;

      setCurrentHighestBid(parsedBidAmount);
      Alert.alert('Success', `You placed a bid of ₱${parsedBidAmount.toLocaleString()}.`);
    } catch (error) {
      console.error('Error placing bid:', error);
      Alert.alert('Error', 'Could not place your bid. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const addToBid = (amount) => {
    const newBid = (parseInt(bidAmount || 0, 10) + amount).toString();
    setBidAmount(newBid);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={30} color="#4A5568" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place a Bid</Text>
      </View>

      <View style={styles.bidInfoContainer}>
        <View style={styles.bidItem}>
          <Text style={styles.bidLabel}>Highest Bid</Text>
          <Text style={styles.bidValue}>₱{currentHighestBid.toLocaleString()}</Text>
        </View>
        <View style={styles.bidItem}>
          <Text style={styles.bidLabel}>No. of Bidders</Text>
          <Text style={styles.bidValue}>{userCount}</Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter your bid"
        value={bidAmount}
        onChangeText={setBidAmount}
        keyboardType="numeric"
        placeholderTextColor="#A0AEC0"
      />

      <View style={styles.presetBidContainer}>
        {[1000, 3000, 5000, 10000].map((amount) => (
          <TouchableOpacity key={amount} style={styles.presetButton} onPress={() => addToBid(amount)}>
            <Text style={styles.presetButtonText}>+₱{amount.toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handlePlaceBid}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Bid</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginLeft: 10,
  },
  bidInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bidItem: {
    alignItems: 'center',
  },
  bidLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 5,
  },
  bidValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  input: {
    height: 50,
    borderColor: '#CBD5E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    marginBottom: 20,
    color: '#2D3748',
  },
  presetBidContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  presetButton: {
    backgroundColor: '#EDF2F7',
    padding: 10,
    borderRadius: 8,
    width: '22%',
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  submitButton: {
    backgroundColor: '#48BB78',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default BidPage;
