
using PuppeteerSharp;

namespace TopGGVoter;
public class RandomTyper 
{
    public async Task Type(String whatToType, IPage page, String selector) 
    {
        Random r = new Random();
        foreach (char c in whatToType)
        {
            String s = "";
            s += c;
            int millisecondsToPause = (int)(r.NextDouble() * 300);
            await Task.Delay(millisecondsToPause);
            await page.TypeAsync(selector, s);
        }
        return;
    }

}