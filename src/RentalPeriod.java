import java.time.LocalDate;

public class RentalPeriod{
    private final LocalDate startDate;
    private final LocalDate endDate;

    public RentalPeriod(LocalDate startDate, LocalDate endDate){
        if (startDate == null){
            throw new IllegalArgumentException("Start date is required");
        }
        if (endDate == null){
            throw new IllegalArgumentException("End date is required");
        }
        if (!endDate.isAfter(startDate)){
            throw new IllegalArgumentException("End date must be after start date");
        }
        this.startDate = startDate;
        this.endDate = endDate;
    }

}