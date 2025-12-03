import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    DeviceEventEmitter,
    Platform,
    SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationBanner = () => {
    const [visible, setVisible] = useState(false);
    const [notification, setNotification] = useState({ title: '', body: '' });
    const translateY = useRef(new Animated.Value(-150)).current;
    const timeoutRef = useRef(null);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('SHOW_NOTIFICATION_BANNER', showBanner);
        return () => {
            subscription.remove();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const showBanner = (data) => {
        setNotification({
            title: data.title || 'Notification',
            body: data.body || '',
            onPress: data.onPress
        });
        setVisible(true);

        // Clear existing timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Animate in
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40
        }).start();

        // Auto hide after 4 seconds
        timeoutRef.current = setTimeout(() => {
            hideBanner();
        }, 4000);
    };

    const hideBanner = () => {
        Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            setVisible(false);
        });
    };

    const handlePress = () => {
        hideBanner();
        if (notification.onPress) {
            notification.onPress();
        }
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY }] }
            ]}
        >
            <SafeAreaView style={styles.safeArea}>
                <TouchableOpacity
                    style={styles.content}
                    onPress={handlePress}
                    activeOpacity={0.9}
                >
                    <View style={styles.iconContainer}>
                        <Icon name="bell-ring" size={24} color="#007AFF" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
                        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={hideBanner}>
                        <Icon name="close" size={20} color="#999" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </SafeAreaView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    safeArea: {
        backgroundColor: 'transparent',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 16, // Extra padding for Android status bar if not handled by SafeArea
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    body: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    closeButton: {
        padding: 8,
    }
});

export default NotificationBanner;
