using PuppeteerSharp;

namespace TopGGVoter;

public static class Utilities 
{
    private static Random random = new Random();
    public static async Task DelayAbout(float seconds, float randomVariationMax) 
    {
        await Task.Delay((int)(((seconds) + (float)random.NextDouble() * randomVariationMax)) * 1000);
        return;
    }

    public static async Task<bool> ClickElementOfTypeWithInnerText(IPage page, String elementType, String innerText) 
    {
        
        IElementHandle[] allElements = await page.XPathAsync($"//{elementType}");

        foreach (IElementHandle element in allElements)
        {
            if (await element.EvaluateFunctionAsync<bool>($"e => {{try{{if (e.innerText === \"{innerText}\") return true;}}catch(err){{return false;}} }}"))
            {
                await element.ClickAsync();
                return true;
            }
        }

        return false;
    }

    public static async Task<bool> ClickElementWithSelector(IPage page, String selector) 
    {
        try 
        {
            IElementHandle[] elements = await page.QuerySelectorAllAsync(selector);

            if (elements is null)
            {
                Console.WriteLine($"Failed to find element to click with selector {selector}");
                return false;
            } 
            else if (elements.Length > 1)
                Console.WriteLine($"Found more than one element with selector {selector}. Continuing...");

            await elements[0].ClickAsync();

            return true;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            return false;
        }
    }

    public static async Task<bool> TypeInInputFieldWithSelector(IPage page, String whatToType, String selector, Pair<float, float> delayAndVariation)
    {
        try 
        {
            IElementHandle[] elements = await page.QuerySelectorAllAsync(selector);

            if (elements is null)
            {
                Console.WriteLine($"Failed to find element to type in with selector {selector}");
                return false;
            } 
            else if (elements.Length > 1)
                Console.WriteLine($"Found more than one element with selector {selector}. Continuing...");

            await elements[0].ClickAsync();

            foreach (char c in whatToType)
            {
                await DelayAbout(delayAndVariation.first, delayAndVariation.second);
                await elements[0].TypeAsync(c.ToString());
            }

            return true;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            return false;
        }
    }

    public struct Pair<U, V> 
    {
        public Pair(U first, V second)
        {
            this.first = first;
            this.second = second;
        }

        public U first;
        public V second;
    }
}