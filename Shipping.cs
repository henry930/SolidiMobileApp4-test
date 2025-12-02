using System;

public static class Shipping
{
    public static int MinimalNumberOfPackages(int items, int availableLargePackages, int availableSmallPackages)
    {
        // Calculate the minimum large packages needed if we use only large packages
        int minLargeForAllItems = (items + 4) / 5; // Ceiling division
        
        // Try to use as many large packages as possible to minimize total packages
        // Start with minimum of: what we need, or what we have available
        int maxLargeToTry = Math.Min(minLargeForAllItems, availableLargePackages);
        
        // Try from maximum large packages down to 0
        for (int largePackages = maxLargeToTry; largePackages >= 0; largePackages--)
        {
            int remainingItems = items - (largePackages * 5);
            // If large packages cover all items, we don't need any small packages
            int smallPackagesNeeded = Math.Max(0, remainingItems);
            
            // Check if we have enough small packages for the remaining items
            if (smallPackagesNeeded <= availableSmallPackages)
            {
                return largePackages + smallPackagesNeeded;
            }
        }
        
        // If we can't package all items, return -1
        return -1;
    }

    public static void Main(string[] args)
    {
        // Test case from the problem description
        Console.WriteLine(Shipping.MinimalNumberOfPackages(13, 3, 10)); // Expected: 3
        
        // Additional test cases
        Console.WriteLine(Shipping.MinimalNumberOfPackages(10, 2, 0));  // Expected: 2
        Console.WriteLine(Shipping.MinimalNumberOfPackages(7, 1, 5));   // Expected: 3
        Console.WriteLine(Shipping.MinimalNumberOfPackages(5, 0, 3));   // Expected: -1
        Console.WriteLine(Shipping.MinimalNumberOfPackages(0, 5, 5));   // Expected: 0
        Console.WriteLine(Shipping.MinimalNumberOfPackages(16, 2, 8));  // Expected: 4
    }
}
